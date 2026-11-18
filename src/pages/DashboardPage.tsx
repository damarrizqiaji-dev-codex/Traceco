import { ArrowRight, Eye } from 'lucide-react';
import type { AppPageId, TracecoState } from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
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
  ContributionTrendChart,
  DistributionUtilizationChart,
  VerificationStatusChart,
} from '../components/ui/SimpleCharts';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';

interface DashboardPageProps {
  state: TracecoState;
  onNavigate: (page: AppPageId, subTab?: string) => void;
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

  // 1. KONTRIBUTOR OVERVIEW (Focused Summary Only)
  if (isPenyerahRole(state.activeRole)) {
    const mySubmissions = state.ecobrick_submissions
      .filter((s) => s.contributorId === actorId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const stats = computeContributorStats(state, actorId);
    const verifiedRatioPct =
      stats.submittedUnits > 0
        ? Math.round((stats.verifiedUnits / stats.submittedUnits) * 100)
        : 0;
    const latest = stats.latestSubmission;

    return (
      <div className="space-y-6">
        <PageHeader
          title={`Overview · ${activeActor?.name ?? 'Kontributor'}`}
          description="Ringkasan status kontribusi ecobrick, saldo Green Points, dan langkah berikutnya."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RoleTag role={activeActor?.segment ?? state.activeRole} />
              <PrimaryButton
                size="sm"
                onClick={() => onNavigate('contribution', 'submit')}
              >
                <span>Kirim Ecobrick</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </PrimaryButton>
            </div>
          }
        />

        <MetricStrip
          columns={4}
          items={[
            {
              label: 'Total Ecobrick',
              value: `${stats.submittedUnits} unit`,
              hint: `${mySubmissions.length} kontribusi tercatat`,
            },
            {
              label: 'Terverifikasi',
              value: `${stats.verifiedUnits} unit`,
              hint: `${verifiedRatioPct}% lolos inspeksi`,
              accent: 'primary',
            },
            {
              label: 'Saldo Green Points',
              value: `${stats.pointsBalance.toLocaleString('id-ID')} GP`,
              hint: `+${POINTS_PER_ECOBRICK} GP / unit terverifikasi`,
              accent: 'primary',
            },
            {
              label: 'Menunggu Verifikasi',
              value: `${stats.pendingUnits} unit`,
              hint: latest
                ? `Terakhir: ${latest.submissionId}`
                : 'Belum ada penyerahan',
              accent: stats.pendingUnits > 0 ? 'muted' : 'default',
            },
          ]}
        />

        {/* Active / Latest Contribution + Quick Next Steps */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-7">
            <ContributionTrendChart
              submissions={mySubmissions}
              title="Tren Kontribusi Ecobrick Saya"
              subtitle="Jumlah unit diserahkan dan lolos verifikasi."
              defaultRange="3m"
            />
          </section>

          <section className="space-y-4 lg:col-span-5">
            <div className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-3.5">
              <SectionHeader
                title="Kontribusi Aktif / Terbaru"
                rightSlot={
                  <SecondaryButton
                    size="sm"
                    onClick={() => onNavigate('contribution', 'history')}
                  >
                    Riwayat
                  </SecondaryButton>
                }
              />

              {latest ? (
                <div className="rounded border border-[#E3E8E4] bg-[#F7F9F7] p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-[#245C45]">
                      {latest.submissionId}
                    </span>
                    <StatusTag status={latest.status} />
                  </div>
                  <p className="text-xs text-[#252B28]">
                    {latest.quantitySubmitted} unit · {latest.dropoffPointName}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="font-mono text-[11px] text-[#6B756F]">
                      {latest.date}
                    </span>
                    <SecondaryButton
                      size="sm"
                      onClick={() => onOpenTraceDetail(latest.submissionId)}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Lacak Status</span>
                    </SecondaryButton>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6B756F]">
                  Belum ada kontribusi tercatat. Mulai dengan mengirim ecobrick pertama Anda.
                </p>
              )}

              <div className="divide-y divide-[#EEF2EF] rounded border border-[#E3E8E4]">
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                  <span className="text-[#252B28]">Tukar poin di Green Marketplace</span>
                  <SecondaryButton
                    size="sm"
                    onClick={() => onNavigate('marketplace', 'catalog')}
                  >
                    Buka
                  </SecondaryButton>
                </div>
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                  <span className="text-[#252B28]">Cek mutasi Transaksi & Saldo</span>
                  <SecondaryButton
                    size="sm"
                    onClick={() => onNavigate('transactions', 'balance')}
                  >
                    Saldo
                  </SecondaryButton>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Concise Latest Activity */}
        <section className="space-y-3">
          <SectionHeader
            title="Aktivitas Terbaru"
            rightSlot={
              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('activities', 'feed')}
              >
                Semua Aktivitas
              </SecondaryButton>
            }
          />
          <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white p-4 sm:px-5">
            {state.recent_activities.slice(0, 3).map((act) => (
              <ActivityItem
                key={act.id}
                item={act}
                onInspectBatch={(id) => onOpenTraceDetail(id)}
              />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // 2. MITRA OVERVIEW (Partner-focused summary without internal admin data)
  if (isMitraRole(state.activeRole)) {
    const availableBatches = inventory.filter((i) => i.availableCount > 0);
    const partnerRequests = state.distribution_requests.filter(
      (r) =>
        r.requesterId === actorId || r.requesterType === 'Mitra Pemanfaat'
    );
    const activeRequestsCount = partnerRequests.filter(
      (r) => r.status === 'Pending Review' || r.status === 'Approved'
    ).length;
    const activeDistributionsCount = partnerRequests.filter(
      (r) => r.status === 'Handed Over'
    ).length;

    return (
      <div className="space-y-6">
        <PageHeader
          title={`Overview Mitra · ${activeActor?.name ?? 'Mitra'}`}
          description="Pantau ketersediaan ecobrick terverifikasi, pengajuan permintaan, dan distribusi aktif Anda."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RoleTag role={state.activeRole} />
              <PrimaryButton
                size="sm"
                onClick={() => onNavigate('requests', 'new')}
              >
                <span>Pengajuan Baru</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </PrimaryButton>
            </div>
          }
        />

        <MetricStrip
          columns={4}
          items={[
            {
              label: 'Ecobrick Tersedia',
              value: `${metrics.inventoryAvailableCount} unit`,
              hint: `${availableBatches.length} batch siap diajukan`,
              accent: 'primary',
            },
            {
              label: 'Pengajuan Aktif',
              value: `${activeRequestsCount} pengajuan`,
              hint: 'Menunggu review / disetujui',
            },
            {
              label: 'Distribusi Berjalan',
              value: `${activeDistributionsCount} pengiriman`,
              hint: 'Siap konfirmasi pemanfaatan',
              accent: activeDistributionsCount > 0 ? 'muted' : 'default',
            },
            {
              label: 'Telah Dimanfaatkan',
              value: `${metrics.ecobricksUtilizedCount} unit`,
              hint: `${state.utilization_records.length} proyek tercatat`,
              accent: 'primary',
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <section className="space-y-3 lg:col-span-7">
            <SectionHeader
              title="Permintaan Terbaru Anda"
              rightSlot={
                <SecondaryButton
                  size="sm"
                  onClick={() => onNavigate('requests', 'history')}
                >
                  Riwayat Pengajuan
                </SecondaryButton>
              }
            />
            <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white">
              {partnerRequests.length === 0 ? (
                <p className="p-6 text-center text-xs text-[#6B756F]">
                  Belum ada pengajuan permintaan ecobrick tercatat.
                </p>
              ) : (
                partnerRequests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#245C45]">
                          {req.id} · {req.batchId}
                        </span>
                        <StatusTag status={req.status} />
                      </div>
                      <p className="text-xs text-[#252B28]">
                        {req.requestedCount} unit ·{' '}
                        {req.location ?? req.utilizationCategory}
                      </p>
                    </div>
                    <SecondaryButton
                      size="sm"
                      onClick={() => onInspectTarget(req.batchId)}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Lacak</span>
                    </SecondaryButton>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4 lg:col-span-5">
            <DistributionUtilizationChart metrics={metrics} />
            <div className="flex flex-wrap gap-2 border-t border-[#EEF2EF] pt-3">
              <PrimaryButton
                size="sm"
                onClick={() => onNavigate('requests', 'new')}
              >
                Ajukan Permintaan
              </PrimaryButton>
              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('distribution', 'active')}
              >
                Distribusi Aktif
              </SecondaryButton>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // 3. ADMIN OVERVIEW (Calm High-Level Operational Summary)
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Overview Operasional · ${activeActor?.name ?? 'Admin'}`}
        description="Ringkasan status ekosistem TRACECO dan antrean yang memerlukan tindak lanjut."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RoleTag role={state.activeRole} />
            <PrimaryButton
              size="sm"
              onClick={() => onNavigate('contribution', 'verify')}
            >
              <span>Verifikasi ({metrics.pendingSubmissionsCount})</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </PrimaryButton>
          </div>
        }
      />

      <MetricStrip
        columns={4}
        items={[
          {
            label: 'Total Ecobrick Masuk',
            value: `${metrics.ecobricksSubmittedCount} unit`,
            hint: `${metrics.totalSubmissionsCount} penyerahan tercatat`,
          },
          {
            label: 'Terverifikasi',
            value: `${metrics.ecobricksVerifiedCount} unit`,
            hint: `${metrics.verificationRatePercent}% tingkat lolos`,
            accent: 'primary',
          },
          {
            label: 'Inventori Tersedia',
            value: `${metrics.inventoryAvailableCount} unit`,
            hint: `${metrics.ecobricksUtilizedCount} unit dimanfaatkan`,
            accent: 'primary',
          },
          {
            label: 'Kontributor Aktif',
            value: `${metrics.activeContributorsCount} / ${metrics.totalContributorsCount}`,
            hint: `${metrics.activeSantriCount} santri · ${metrics.activeWargaCount} warga · ${metrics.vulnerableFamilyCount} keluarga rentan`,
          },
        ]}
      />

      {/* Actionable Queues + Key Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-7">
          <ContributionTrendChart
            submissions={state.ecobrick_submissions}
            title="Tren Kontribusi Ekosistem"
            subtitle="Perbandingan ecobrick diserahkan dan lolos verifikasi."
            defaultRange="3m"
          />
        </section>

        <section className="space-y-4 lg:col-span-5">
          <div className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-3">
            <SectionHeader title="Perlu Tindak Lanjut" />
            <div className="divide-y divide-[#EEF2EF] rounded border border-[#E3E8E4]">
              <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#252B28]">
                    Antrean Verifikasi Fisik
                  </p>
                  <p className="text-[11px] text-[#6B756F]">
                    {metrics.pendingSubmissionsCount} berkas (
                    {metrics.ecobricksPendingCount} unit)
                  </p>
                </div>
                <SecondaryButton
                  size="sm"
                  onClick={() => onNavigate('contribution', 'verify')}
                >
                  Periksa
                </SecondaryButton>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#252B28]">
                    Pengajuan Distribusi Mitra
                  </p>
                  <p className="text-[11px] text-[#6B756F]">
                    {metrics.pendingDistributionRequestsCount} pengajuan menunggu
                  </p>
                </div>
                <SecondaryButton
                  size="sm"
                  onClick={() => onNavigate('distribution', 'requests')}
                >
                  Tinjau
                </SecondaryButton>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#252B28]">
                    Penukaran Reward Kontributor
                  </p>
                  <p className="text-[11px] text-[#6B756F]">
                    {metrics.pendingRedemptionsCount} penukaran menunggu
                  </p>
                </div>
                <SecondaryButton
                  size="sm"
                  onClick={() => onNavigate('reward', 'points')}
                >
                  Proses
                </SecondaryButton>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-[#E3E8E4] bg-white p-5">
            <VerificationStatusChart metrics={metrics} />
          </div>
        </section>
      </div>

      {/* Latest Activity Feed */}
      <section className="space-y-3">
        <SectionHeader
          title="Aktivitas Ekosistem Terbaru"
          rightSlot={
            <SecondaryButton
              size="sm"
              onClick={() => onNavigate('monitor', 'trends')}
            >
              Buka Monitoring
            </SecondaryButton>
          }
        />
        <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white p-4 sm:px-5">
          {state.recent_activities.slice(0, 4).map((act) => (
            <ActivityItem
              key={act.id}
              item={act}
              onInspectBatch={(id) => onInspectTarget(id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
