import { ArrowRight, Eye } from 'lucide-react';
import type { AppPageId, TracecoState } from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
  computeActiveContributorBreakdown,
  computeContributorStats,
  computePlatformMetrics,
  computeVerifiedInventory,
  isMitraRole,
  isPenyerahRole,
} from '../utils/tracecoLogic';
import { ActivityItem } from '../components/ui/ActivityItem';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
import { MetricStrip } from '../components/ui/Metric';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import {
  ActiveContributorsChart,
  ContributionTrendChart,
  DistributionUtilizationChart,
  VerificationStatusChart,
} from '../components/ui/SimpleCharts';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';

interface DashboardPageProps {
  state: TracecoState;
  onNavigate: (page: AppPageId) => void;
  onInspectTarget: (targetId: string) => void;
  onOpenTraceDetail: (targetId: string) => void;
}

export function DashboardPage({
  state,
  onNavigate,
  onInspectTarget,
  onOpenTraceDetail,
}: DashboardPageProps) {
  const metrics = computePlatformMetrics(state);
  const inventory = computeVerifiedInventory(
    state.ecobrick_batches,
    state.distribution_requests,
    state.contributors
  );

  const actorId = state.activeActorIdByRole[state.activeRole];
  const activeActor = state.contributors.find((c) => c.id === actorId);
  const verificationMap = new Map(
    state.verification_records.map((v) => [v.submissionId, v])
  );
  const contributorMap = new Map(state.contributors.map((c) => [c.id, c]));

  // 1. Role Group: Penyerah Ecobrick (Santri, Warga, Keluarga Rentan)
  if (isPenyerahRole(state.activeRole)) {
    const mySubmissions = state.ecobrick_submissions
      .filter((s) => s.contributorId === actorId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const stats = computeContributorStats(state, actorId);
    const verifiedRatioPct =
      stats.submittedUnits > 0
        ? Math.round((stats.verifiedUnits / stats.submittedUnits) * 100)
        : 0;

    return (
      <div className="space-y-7">
        <PageHeader
          title={`Dashboard Saya · ${activeActor?.name ?? 'Kontributor'}`}
          description="Pantau perkembangan kontribusi ecobrick, hasil verifikasi, dan saldo Green Points Anda."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RoleTag role={state.activeRole} />
              <PrimaryButton
                size="sm"
                onClick={() => onNavigate('contribution')}
              >
                <span>Submit Ecobrick</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </PrimaryButton>
            </div>
          }
        />

        {/* Primary 4 KPIs */}
        <MetricStrip
          columns={4}
          items={[
            {
              label: 'Total Ecobrick Diserahkan',
              value: `${stats.submittedUnits} unit`,
              hint: `${mySubmissions.length} catatan kontribusi`,
            },
            {
              label: 'Total Terverifikasi',
              value: `${stats.verifiedUnits} unit`,
              hint: `${verifiedRatioPct}% lolos inspeksi fisik`,
              accent: 'primary',
            },
            {
              label: 'Menunggu Verifikasi (Pending)',
              value: `${stats.pendingUnits} unit`,
              hint:
                stats.rejectedUnits > 0
                  ? `${stats.rejectedUnits} unit ditolak`
                  : 'Antrean pos Eco-Hub',
              accent: 'muted',
            },
            {
              label: 'Green Points Balance',
              value: `${stats.pointsBalance} pts`,
              hint: `Total diperoleh ${stats.pointsEarned} pts (+${POINTS_PER_ECOBRICK} pts/unit)`,
              accent: 'primary',
            },
          ]}
        />

        {/* Secondary contributor quick summary */}
        <MetricStrip
          columns={4}
          items={[
            {
              label: 'Kontribusi Bulan Ini',
              value: `${stats.monthUnits} unit`,
              hint: 'Periode November 2026',
            },
            {
              label: 'Rewards Redeemed',
              value: `${stats.rewardsRedeemedCount} penukaran`,
              hint: `${stats.pointsRedeemed} pts telah ditukar`,
            },
            {
              label: 'Kontribusi Terakhir',
              value: stats.latestSubmission?.submissionId ?? '-',
              hint: stats.latestSubmission
                ? `${stats.latestSubmission.date} · ${stats.latestSubmission.status}`
                : 'Belum ada penyerahan',
            },
            {
              label: 'Progress Verifikasi',
              value: `${stats.verifiedUnits} / ${stats.submittedUnits} unit`,
              hint: `${verifiedRatioPct}% terverifikasi menjadi batch`,
            },
          ]}
        />

        {/* Chart + Verification Progress */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-8">
            <ContributionTrendChart
              submissions={mySubmissions}
              title="Kontribusi Ecobrick Saya"
              subtitle="Jumlah unit ecobrick diserahkan dan lolos verifikasi sesuai periode waktu."
              defaultRange="3m"
            />
          </section>

          <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4 lg:col-span-4">
            <div className="space-y-1">
              <h3 className="text-[14px] font-semibold text-[#252B28]">
                Ringkasan Progress & Aksi
              </h3>
              <p className="text-[11px] text-[#6B756F]">
                Rasio ecobrick terverifikasi terhadap total penyerahan Anda.
              </p>
            </div>

            <div className="space-y-2 rounded border border-[#E3E8E4] bg-[#F7F9F7] p-3.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-[#252B28]">
                  Verified / Submitted
                </span>
                <span className="font-mono font-semibold text-[#245C45] tabular-nums">
                  {stats.verifiedUnits} / {stats.submittedUnits} ({verifiedRatioPct}
                  %)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded bg-[#E3E8E4]">
                <div
                  className="h-full rounded bg-[#245C45]"
                  style={{ width: `${verifiedRatioPct}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-[#EEF2EF] rounded border border-[#E3E8E4]">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                <span className="text-[#252B28]">Serahkan Ecobrick Baru</span>
                <SecondaryButton
                  size="sm"
                  onClick={() => onNavigate('contribution')}
                >
                  Submit
                </SecondaryButton>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                <span className="text-[#252B28]">Tukar Green Points</span>
                <SecondaryButton size="sm" onClick={() => onNavigate('reward')}>
                  Katalog
                </SecondaryButton>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                <span className="text-[#252B28]">Lacak Status Batch & QR</span>
                <SecondaryButton
                  size="sm"
                  onClick={() => onNavigate('traceability')}
                >
                  Traceability
                </SecondaryButton>
              </div>
            </div>
          </section>
        </div>

        {/* Recent Contributions & Activity Feed */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="space-y-3 lg:col-span-8">
            <SectionHeader
              title="Recent Contributions"
              rightSlot={
                <SecondaryButton
                  size="sm"
                  onClick={() => onNavigate('contribution')}
                >
                  Lihat Semua
                </SecondaryButton>
              }
            />

            <div className="overflow-x-auto rounded-md border border-[#E3E8E4] bg-white">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#E3E8E4] bg-[#F7F9F7] text-[11px] font-semibold uppercase tracking-wider text-[#6B756F]">
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-4 py-2.5">Tanggal</th>
                    <th className="px-4 py-2.5 text-right">Jumlah</th>
                    <th className="px-4 py-2.5 text-right">Berat</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Reward</th>
                    <th className="px-4 py-2.5 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EF]">
                  {mySubmissions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-xs text-[#6B756F]"
                      >
                        Belum ada penyerahan ecobrick tercatat atas akun ini.
                      </td>
                    </tr>
                  ) : (
                    mySubmissions.slice(0, 5).map((sub) => {
                      const ver = verificationMap.get(sub.submissionId);
                      const earnedPts = sub.verifiedQuantity * POINTS_PER_ECOBRICK;
                      return (
                        <tr key={sub.submissionId} className="hover:bg-[#FAFBF9]">
                          <td className="px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => onOpenTraceDetail(sub.submissionId)}
                              className="font-mono text-xs font-semibold text-[#245C45] hover:underline"
                            >
                              {sub.submissionId}
                            </button>
                            {ver?.batchId && (
                              <p className="font-mono text-[11px] text-[#6B756F]">
                                {ver.batchId}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top font-mono text-xs text-[#6B756F] tabular-nums whitespace-nowrap">
                            {sub.date}
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono text-xs tabular-nums whitespace-nowrap">
                            {sub.quantitySubmitted} unit
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono text-xs text-[#6B756F] tabular-nums whitespace-nowrap">
                            {sub.weightKg ? `${sub.weightKg.toFixed(1)} kg` : '-'}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusTag status={sub.status} />
                            {ver?.rejectionReason && (
                              <p className="mt-1 max-w-[200px] text-[11px] text-[#991B1B]">
                                {ver.rejectionReason}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono text-xs font-semibold text-[#245C45] tabular-nums whitespace-nowrap">
                            {earnedPts > 0 ? `+${earnedPts} pts` : '-'}
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <button
                              type="button"
                              onClick={() => onOpenTraceDetail(sub.submissionId)}
                              className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2 py-1 text-[11px] font-medium text-[#245C45] hover:bg-[#E7F0E8] transition-colors whitespace-nowrap"
                            >
                              <Eye className="h-3 w-3" aria-hidden="true" />
                              <span>Detail</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 lg:col-span-4">
            <SectionHeader title="Activity Feed" />
            <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white p-4">
              {state.recent_activities.slice(0, 5).map((act) => (
                <ActivityItem
                  key={act.id}
                  item={act}
                  onInspectBatch={(id) => onOpenTraceDetail(id)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // 2. Role: Mitra
  if (isMitraRole(state.activeRole)) {
    const availableBatches = inventory.filter((i) => i.availableCount > 0);
    const partnerRequests = state.distribution_requests.filter(
      (r) =>
        r.requesterId === actorId ||
        r.requesterType === 'Mitra Pemanfaat' ||
        r.status !== 'Rejected'
    );

    return (
      <div className="space-y-7">
        <PageHeader
          title={`Dashboard Mitra · ${activeActor?.name ?? 'Mitra'}`}
          description="Pantau stok ecobrick terverifikasi yang tersedia, ajukan permintaan pemanfaatan, dan dokumentasikan proyek nyata."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RoleTag role={state.activeRole} />
              <PrimaryButton
                size="sm"
                onClick={() => onNavigate('distribution')}
              >
                <span>Request Ecobrick</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </PrimaryButton>
            </div>
          }
        />

        <MetricStrip
          columns={4}
          items={[
            {
              label: 'Available Inventory',
              value: `${metrics.inventoryAvailableCount} unit`,
              hint: `${availableBatches.length} batch siap dimanfaatkan`,
              accent: 'primary',
            },
            {
              label: 'Reserved (Approved)',
              value: `${metrics.ecobricksReservedCount} unit`,
              hint: 'Menunggu jadwal serah terima',
            },
            {
              label: 'Distributed / Handed Over',
              value: `${metrics.ecobricksDistributedCount} unit`,
              hint: 'Sudah diserahterimakan',
            },
            {
              label: 'Ecobrick Utilized',
              value: `${metrics.ecobricksUtilizedCount} unit`,
              hint: `${state.utilization_records.length} catatan selesai`,
              accent: 'primary',
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <section className="space-y-3 lg:col-span-7">
            <SectionHeader
              title="Batch Terverifikasi Siap Dimanfaatkan"
              rightSlot={
                <SecondaryButton
                  size="sm"
                  onClick={() => onNavigate('distribution')}
                >
                  Ajukan Batch
                </SecondaryButton>
              }
            />
            <div className="overflow-x-auto rounded-md border border-[#E3E8E4] bg-white">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#E3E8E4] bg-[#F7F9F7] text-[11px] font-semibold uppercase tracking-wider text-[#6B756F]">
                    <th className="px-4 py-2.5">Batch ID</th>
                    <th className="px-4 py-2.5">Ukuran Botol</th>
                    <th className="px-4 py-2.5 text-right">Available</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Lacak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EF]">
                  {availableBatches.map((item) => (
                    <tr key={item.batchId} className="hover:bg-[#FAFBF9]">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#245C45]">
                        {item.batchId}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#252B28]">
                        {item.bottleSize}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                        {item.availableCount} unit
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag status={item.inventoryStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onInspectTarget(item.batchId)}
                          className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2 py-1 text-[11px] font-medium text-[#245C45] hover:bg-[#E7F0E8] transition-colors"
                        >
                          <Eye className="h-3 w-3" aria-hidden="true" />
                          <span>Trace</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-5 lg:col-span-5">
            <div className="rounded-md border border-[#E3E8E4] bg-white p-5">
              <DistributionUtilizationChart metrics={metrics} />
            </div>

            <div className="space-y-3">
              <SectionHeader
                title="Permintaan Terbaru"
                rightSlot={
                  <SecondaryButton
                    size="sm"
                    onClick={() => onNavigate('my_requests')}
                  >
                    My Requests
                  </SecondaryButton>
                }
              />
              <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white">
                {partnerRequests.slice(0, 3).map((req) => (
                  <div key={req.id} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[#245C45]">
                        {req.id} · {req.batchId}
                      </span>
                      <StatusTag status={req.status} />
                    </div>
                    <p className="text-xs font-medium text-[#252B28]">
                      {req.requestedCount} unit · {req.location ?? req.utilizationCategory}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // 3. Role: Admin (Full Ecosystem Overview + 8 KPIs + 4 Data-Driven Charts)
  const contributorBreakdown = computeActiveContributorBreakdown(state);

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Overview Ekosistem TRACECO · ${activeActor?.name ?? 'Admin'}`}
        description="Kondisi operasional menyeluruh: kontribusi ecobrick, tingkat verifikasi, Green Points, inventori, dan pemanfaatan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RoleTag role={state.activeRole} />
            <SecondaryButton size="sm" onClick={() => onNavigate('inventory')}>
              Inventory
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              onClick={() => onNavigate('verification')}
            >
              <span>Antrean Verifikasi ({metrics.pendingSubmissionsCount})</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </PrimaryButton>
          </div>
        }
      />

      {/* Top KPI Row */}
      <MetricStrip
        columns={4}
        items={[
          {
            label: 'Total Submitted',
            value: `${metrics.ecobricksSubmittedCount} unit`,
            hint: `${metrics.totalSubmissionsCount} berkas penyerahan`,
          },
          {
            label: 'Total Verified',
            value: `${metrics.ecobricksVerifiedCount} unit`,
            hint: `${state.ecobrick_batches.length} batch resmi diterbitkan`,
            accent: 'primary',
          },
          {
            label: 'Verification Rate',
            value: `${metrics.verificationRatePercent}%`,
            hint: `${metrics.ecobricksRejectedCount} unit ditolak`,
            accent: 'primary',
          },
          {
            label: 'Active Contributors',
            value: `${metrics.activeContributorsCount} / ${metrics.totalContributorsCount}`,
            hint: `${metrics.activeSantriCount} santri · ${metrics.activeWargaCount} warga · ${metrics.vulnerableFamilyCount} keluarga rentan`,
          },
        ]}
      />

      {/* Second KPI Row */}
      <MetricStrip
        columns={4}
        items={[
          {
            label: 'Green Points Distributed',
            value: `${metrics.totalPointsDistributed} pts`,
            hint: `${metrics.totalPointsRedeemed} pts ditukarkan (${metrics.totalRedemptionsCount} kali)`,
            accent: 'primary',
          },
          {
            label: 'Available Inventory',
            value: `${metrics.inventoryAvailableCount} unit`,
            hint: `${metrics.ecobricksReservedCount} unit berstatus reserved`,
          },
          {
            label: 'Distributed / Utilized',
            value: `${metrics.ecobricksDistributedCount} / ${metrics.ecobricksUtilizedCount}`,
            hint: `${state.utilization_records.length} proyek terpasang`,
          },
          {
            label: 'Pending Verification',
            value: `${metrics.ecobricksPendingCount} unit`,
            hint: `${metrics.pendingSubmissionsCount} berkas · ${metrics.pendingDistributionRequestsCount} req distribusi`,
            accent: 'muted',
          },
        ]}
      />

      {/* 4 Useful Data-Driven Charts (2x2 Grid) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-7">
          <ContributionTrendChart
            submissions={state.ecobrick_submissions}
            title="1. Ecobrick Contribution Trend"
            subtitle="Tren penyerahan dan verifikasi seluruh ekosistem Pesantren Al-Amanah."
            defaultRange="3m"
          />
        </section>

        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-5">
          <VerificationStatusChart metrics={metrics} />
        </section>

        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-6">
          <ActiveContributorsChart breakdown={contributorBreakdown} />
        </section>

        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-6">
          <DistributionUtilizationChart metrics={metrics} />
        </section>
      </div>

      {/* Bottom Row: Operational Queue + Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-3 lg:col-span-5">
          <SectionHeader title="Tindak Lanjut Operasional" />
          <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <p className="text-[13px] font-medium text-[#252B28]">
                  Antrean Verifikasi Fisik
                </p>
                <p className="text-xs text-[#6B756F]">
                  {metrics.pendingSubmissionsCount} submission (
                  {metrics.ecobricksPendingCount} unit) menunggu periksa
                </p>
              </div>
              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('verification')}
              >
                Periksa
              </SecondaryButton>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <p className="text-[13px] font-medium text-[#252B28]">
                  Permintaan Distribusi & Handover
                </p>
                <p className="text-xs text-[#6B756F]">
                  {metrics.pendingDistributionRequestsCount} permintaan menunggu
                  persetujuan
                </p>
              </div>
              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('distribution')}
              >
                Tinjau
              </SecondaryButton>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <p className="text-[13px] font-medium text-[#252B28]">
                  Penukaran Green Reward
                </p>
                <p className="text-xs text-[#6B756F]">
                  {metrics.pendingRedemptionsCount} penukaran menunggu proses
                </p>
              </div>
              <SecondaryButton size="sm" onClick={() => onNavigate('reward')}>
                Proses
              </SecondaryButton>
            </div>
          </div>
        </section>

        <section className="space-y-3 lg:col-span-7">
          <SectionHeader
            title="Aktivitas Terbaru Ekosistem"
            rightSlot={
              <button
                type="button"
                onClick={() => onNavigate('notifications')}
                className="text-xs font-medium text-[#245C45] hover:underline"
              >
                Lihat Notifikasi
              </button>
            }
          />
          <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white p-4 sm:p-5">
            {state.recent_activities.slice(0, 5).map((act) => (
              <ActivityItem
                key={act.id}
                item={act}
                onInspectBatch={(id) => onInspectTarget(id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
