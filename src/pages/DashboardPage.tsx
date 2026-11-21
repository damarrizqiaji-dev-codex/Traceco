import { useState } from 'react';
import { ArrowRight, Database, Eye, ShieldCheck, Send, Award } from 'lucide-react';
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
  onInitializeMasterCatalog?: () => Promise<{ error?: string }>;
}

export function DashboardPage({
  state,
  onNavigate,
  onInspectTarget,
  onOpenTraceDetail,
  onInitializeMasterCatalog,
}: DashboardPageProps) {
  const [initBusy, setInitBusy] = useState(false);
  const metrics = computePlatformMetrics(state);
  const inventory = computeVerifiedInventory(
    state.ecobrick_batches,
    state.distribution_requests,
    state.contributors
  );

  const actorId = state.currentUserId ?? '';
  const activeActor = state.contributors.find((c) => c.id === actorId);

  // 1. KONTRIBUTOR OVERVIEW
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

    const sortedRewards = [...state.rewards].sort(
      (a, b) => a.pointsCost - b.pointsCost
    );
    const nextGoalReward =
      sortedRewards.find((r) => r.pointsCost > stats.pointsBalance) ??
      sortedRewards[sortedRewards.length - 1];
    const affordableCount = state.rewards.filter(
      (r) => stats.pointsBalance >= r.pointsCost
    ).length;
    const goalPct = nextGoalReward
      ? Math.min(
          100,
          Math.round((stats.pointsBalance / Math.max(1, nextGoalReward.pointsCost)) * 100)
        )
      : 100;

    return (
      <div className="space-y-6">
        <PageHeader
          title={`Overview · ${activeActor?.name ?? 'Kontributor'}`}
          description="Ringkasan status kontribusi ecobrick, saldo Green Points, dan langkah berikutnya."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <RoleTag
                role={state.activeRole}
                segment={activeActor?.segment}
              />
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

        {/* Hero Summary Card */}
        <section className="rounded-lg border border-[#D9E0DC] bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <p className="font-mono text-xs font-semibold text-[#1B5E43]">
                Saldo Green Points &amp; Target Reward
              </p>
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="font-display text-3xl font-semibold tracking-tight text-[#141B17] tabular-nums">
                  {stats.pointsBalance.toLocaleString('id-ID')} GP
                </p>
                <span className="font-mono text-xs text-[#58655E]">
                  +{POINTS_PER_ECOBRICK} GP / unit terverifikasi
                </span>
              </div>
              {nextGoalReward ? (
                <div className="pt-1 space-y-1.5 max-w-md">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#34403A]">
                    <span>
                      {stats.pointsBalance >= nextGoalReward.pointsCost
                        ? `${affordableCount} reward siap ditukar sekarang`
                        : `Menuju "${nextGoalReward.title}" (${nextGoalReward.pointsCost} GP)`}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-[#1B5E43] tabular-nums">
                      {goalPct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ECF0ED]">
                    <div
                      className="h-full rounded-full bg-[#1B5E43] transition-[width] duration-300"
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#58655E]">
                  Kumpulkan Green Points dari setiap ecobrick yang lolos inspeksi pos.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('marketplace', 'catalog')}
              >
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Green Marketplace</span>
              </SecondaryButton>
              <PrimaryButton
                size="sm"
                onClick={() => onNavigate('contribution', 'submit')}
              >
                <span>Kirim Ecobrick Baru</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </PrimaryButton>
            </div>
          </div>
        </section>

        <MetricStrip
          columns={4}
          items={[
            {
              label: 'Total Ecobrick',
              value: `${stats.submittedUnits} unit`,
              hint: `${mySubmissions.length} kontribusi tercatat`,
              onClick: () => onNavigate('contribution', 'history'),
            },
            {
              label: 'Terverifikasi',
              value: `${stats.verifiedUnits} unit`,
              hint: `${verifiedRatioPct}% lolos inspeksi`,
              accent: 'primary',
              progressPercent: verifiedRatioPct,
              onClick: () => onNavigate('contribution', 'history'),
            },
            {
              label: 'Saldo Green Points',
              value: `${stats.pointsBalance.toLocaleString('id-ID')} GP`,
              hint: `${affordableCount} item siap ditukar`,
              accent: 'teal',
              onClick: () => onNavigate('marketplace', 'catalog'),
            },
            {
              label: 'Menunggu Verifikasi',
              value: `${stats.pendingUnits} unit`,
              hint: latest
                ? `Terakhir: ${latest.submissionId}`
                : 'Belum ada penyerahan',
              accent: stats.pendingUnits > 0 ? 'amber' : 'muted',
              onClick: () =>
                latest
                  ? onOpenTraceDetail(latest.submissionId)
                  : onNavigate('contribution', 'submit'),
            },
          ]}
        />

        {/* Active / Latest Contribution + Quick Next Steps */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <section className="rounded-lg border border-[#D9E0DC] bg-white p-5 lg:col-span-7">
            <ContributionTrendChart
              submissions={mySubmissions}
              title="Tren Kontribusi Ecobrick Saya"
              subtitle="Jumlah unit diserahkan dan lolos verifikasi."
              defaultRange="3m"
            />
          </section>

          <section className="rounded-lg border border-[#D9E0DC] bg-white p-5 space-y-4 lg:col-span-5">
            <SectionHeader
              title="Kontribusi Aktif & Pintasan"
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
              <div className="border-y border-[#EAEFEA] py-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-[#1B5E43]">
                    {latest.submissionId}
                  </span>
                  <StatusTag status={latest.status} />
                </div>
                <p className="text-xs text-[#1B231F]">
                  {latest.quantitySubmitted} unit · {latest.dropoffPointName}
                </p>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="font-mono text-[11px] text-[#58655E]">
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
              <p className="border-y border-[#EAEFEA] py-3.5 text-xs text-[#58655E]">
                Belum ada kontribusi tercatat. Mulai dengan mengirim ecobrick
                pertama Anda.
              </p>
            )}

            <div className="divide-y divide-[#EAEFEA]">
              <button
                type="button"
                onClick={() => onNavigate('marketplace', 'catalog')}
                className="flex w-full items-center justify-between gap-2 py-2.5 text-left text-xs transition-colors duration-150 hover:text-[#1B5E43]"
              >
                <span className="font-medium text-[#1B231F]">
                  Tukar poin di Green Marketplace
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-[#1B5E43]">
                  <span>Buka</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('transactions', 'balance')}
                className="flex w-full items-center justify-between gap-2 py-2.5 text-left text-xs transition-colors duration-150 hover:text-[#2B5E6B]"
              >
                <span className="font-medium text-[#1B231F]">
                  Cek mutasi Transaksi &amp; Saldo
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-[#2B5E6B]">
                  <span>Saldo</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </button>
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
          <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white p-4 sm:px-5">
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

  // 2. MITRA OVERVIEW
  if (isMitraRole(state.activeRole)) {
    const availableBatches = inventory.filter((i) => i.availableCount > 0);
    const partnerRequests = state.distribution_requests.filter(
      (r) => r.requesterId === actorId
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
            <div className="flex flex-wrap items-center gap-3">
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

        {/* Mitra Hero Pool Banner */}
        <section className="rounded-lg border border-[#D9E0DC] bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="font-mono text-xs font-semibold text-[#1B5E43]">
                Stok Batch Terverifikasi Siap Dimanfaatkan
              </p>
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="font-display text-3xl font-semibold text-[#141B17] tabular-nums">
                  {metrics.inventoryAvailableCount} unit
                </p>
                <span className="font-mono text-xs text-[#58655E]">
                  dalam {availableBatches.length} batch terverifikasi
                </span>
              </div>
              <p className="text-xs text-[#58655E]">
                Pilih batch sesuai ukuran botol proyek lalu konfirmasi pemanfaatan aktual setelah pemasangan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <SecondaryButton
                size="sm"
                onClick={() => onNavigate('distribution', 'active')}
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Distribusi Aktif ({activeDistributionsCount})</span>
              </SecondaryButton>
              <PrimaryButton
                size="sm"
                onClick={() => onNavigate('requests', 'new')}
              >
                <span>Ajukan Permintaan</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </PrimaryButton>
            </div>
          </div>
        </section>

        <MetricStrip
          columns={4}
          items={[
            {
              label: 'Ecobrick Tersedia',
              value: `${metrics.inventoryAvailableCount} unit`,
              hint: `${availableBatches.length} batch siap diajukan`,
              accent: 'primary',
              onClick: () => onNavigate('requests', 'new'),
            },
            {
              label: 'Pengajuan Aktif',
              value: `${activeRequestsCount} pengajuan`,
              hint: 'Menunggu review / disetujui',
              accent: activeRequestsCount > 0 ? 'amber' : 'default',
              onClick: () => onNavigate('requests', 'history'),
            },
            {
              label: 'Distribusi Berjalan',
              value: `${activeDistributionsCount} pengiriman`,
              hint: 'Siap konfirmasi pemanfaatan',
              accent: activeDistributionsCount > 0 ? 'teal' : 'muted',
              onClick: () => onNavigate('distribution', 'active'),
            },
            {
              label: 'Telah Dimanfaatkan',
              value: `${metrics.ecobricksUtilizedCount} unit`,
              hint: `${state.utilization_records.length} proyek tercatat`,
              accent: 'teal',
              onClick: () => onNavigate('distribution', 'history'),
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
            <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white">
              {partnerRequests.length === 0 ? (
                <p className="p-6 text-center text-xs text-[#58655E]">
                  Belum ada pengajuan permintaan ecobrick tercatat.
                </p>
              ) : (
                partnerRequests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#F8FAF9] transition-colors duration-150"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#1B5E43]">
                          {req.id} · {req.batchId}
                        </span>
                        <StatusTag status={req.status} />
                      </div>
                      <p className="text-xs text-[#1B231F]">
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

          <section className="rounded-lg border border-[#D9E0DC] bg-white p-5 space-y-4 lg:col-span-5">
            <DistributionUtilizationChart metrics={metrics} />
            <div className="flex flex-wrap gap-2 border-t border-[#EAEFEA] pt-3">
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

  // 3. ADMIN OVERVIEW
  const totalActionableQueue =
    metrics.pendingSubmissionsCount +
    metrics.pendingDistributionRequestsCount +
    metrics.pendingRedemptionsCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Overview Operasional · ${activeActor?.name ?? 'Admin'}`}
        description="Ringkasan status ekosistem TRACECO dan antrean yang memerlukan tindak lanjut."
        actions={
          <div className="flex flex-wrap items-center gap-3">
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

      {/* Admin Operational Command Strip */}
      <section className="rounded-lg border border-[#D9E0DC] bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="font-mono text-xs font-semibold text-[#1B5E43]">
              Pusat Komando Eco-Hub Pesantren
            </p>
            <p className="font-display text-lg font-semibold text-[#141B17]">
              {totalActionableQueue > 0
                ? `${totalActionableQueue} item antrean memerlukan tindak lanjut Admin`
                : 'Semua antrean operasional saat ini telah tertangani'}
            </p>
            <p className="text-xs text-[#58655E]">
              Plastik terkemas terverifikasi:{' '}
              <span className="font-mono font-semibold text-[#141B17] tabular-nums">
                {metrics.plasticDivertedContextKg.toFixed(1)} kg
              </span>{' '}
              · Tingkat lolos inspeksi:{' '}
              <span className="font-mono font-semibold text-[#1B5E43] tabular-nums">
                {metrics.verificationRatePercent}%
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onNavigate('contribution', 'verify')}
              className="flex items-center justify-between gap-3 rounded-md border border-[#D9E0DC] bg-[#F8FAF9] px-3.5 py-2.5 text-left transition-colors hover:border-[#1B5E43] hover:bg-[#EFF5F2]"
            >
              <div>
                <p className="text-[11px] text-[#58655E]">Verifikasi</p>
                <p className="font-mono text-sm font-semibold text-[#141B17] tabular-nums">
                  {metrics.pendingSubmissionsCount} berkas
                </p>
              </div>
              <ShieldCheck
                className="h-4 w-4 text-[#1B5E43]"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('distribution', 'requests')}
              className="flex items-center justify-between gap-3 rounded-md border border-[#D9E0DC] bg-[#F8FAF9] px-3.5 py-2.5 text-left transition-colors hover:border-[#2B5E6B] hover:bg-[#F1F6F7]"
            >
              <div>
                <p className="text-[11px] text-[#58655E]">Distribusi</p>
                <p className="font-mono text-sm font-semibold text-[#141B17] tabular-nums">
                  {metrics.pendingDistributionRequestsCount} ajuan
                </p>
              </div>
              <Send className="h-4 w-4 text-[#2B5E6B]" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reward', 'points')}
              className="flex items-center justify-between gap-3 rounded-md border border-[#D9E0DC] bg-[#F8FAF9] px-3.5 py-2.5 text-left transition-colors hover:border-[#A15C17] hover:bg-[#FBF6EE]"
            >
              <div>
                <p className="text-[11px] text-[#58655E]">Penukaran GP</p>
                <p className="font-mono text-sm font-semibold text-[#141B17] tabular-nums">
                  {metrics.pendingRedemptionsCount} antrean
                </p>
              </div>
              <Award className="h-4 w-4 text-[#A15C17]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {(state.dropoff_points.length === 0 || state.rewards.length === 0) &&
        onInitializeMasterCatalog && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#C5D9CD] bg-[#EFF5F2] px-5 py-4">
            <div className="flex items-start gap-3">
              <Database
                className="mt-0.5 h-4 w-4 shrink-0 text-[#1B5E43]"
                aria-hidden="true"
              />
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold text-[#1B5E43]">
                  Siapkan Master Data Pos Serah &amp; Katalog Reward di Firestore
                </p>
                <p className="text-[#1B231F]">
                  Database produksi masih kosong ({state.dropoff_points.length}{' '}
                  pos serah, {state.rewards.length} item reward). Aktifkan pos
                  &amp; katalog standar Pesantren agar Kontributor bisa langsung
                  mengirim ecobrick dan menukar poin.
                </p>
              </div>
            </div>
            <PrimaryButton
              size="sm"
              disabled={initBusy}
              onClick={async () => {
                setInitBusy(true);
                try {
                  await onInitializeMasterCatalog();
                } finally {
                  setInitBusy(false);
                }
              }}
            >
              <span>
                {initBusy
                  ? 'Menyiapkan Data...'
                  : 'Aktifkan Pos & Katalog Standar'}
              </span>
            </PrimaryButton>
          </section>
        )}

      <MetricStrip
        columns={4}
        items={[
          {
            label: 'Total Ecobrick Masuk',
            value: `${metrics.ecobricksSubmittedCount} unit`,
            hint: `${metrics.totalSubmissionsCount} penyerahan tercatat`,
            onClick: () => onNavigate('contribution', 'all'),
          },
          {
            label: 'Terverifikasi',
            value: `${metrics.ecobricksVerifiedCount} unit`,
            hint: `${metrics.verificationRatePercent}% tingkat lolos`,
            accent: 'primary',
            progressPercent: metrics.verificationRatePercent,
            onClick: () => onNavigate('contribution', 'verify_history'),
          },
          {
            label: 'Inventori Tersedia',
            value: `${metrics.inventoryAvailableCount} unit`,
            hint: `${metrics.ecobricksUtilizedCount} unit dimanfaatkan`,
            accent: 'teal',
            onClick: () => onNavigate('inventory', 'available'),
          },
          {
            label: 'Kontributor Aktif',
            value: `${metrics.activeContributorsCount} / ${metrics.totalContributorsCount}`,
            hint: `${metrics.activeSantriCount} santri · ${metrics.activeWargaCount} warga · ${metrics.vulnerableFamilyCount} keluarga rentan`,
            accent: 'default',
            onClick: () => onNavigate('monitor', 'users'),
          },
        ]}
      />

      {/* Actionable Queues + Key Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <section className="rounded-lg border border-[#D9E0DC] bg-white p-5 lg:col-span-7">
          <ContributionTrendChart
            submissions={state.ecobrick_submissions}
            title="Tren Kontribusi Ekosistem"
            subtitle="Perbandingan ecobrick diserahkan dan lolos verifikasi."
            defaultRange="3m"
          />
        </section>

        <section className="space-y-4 lg:col-span-5">
          <div className="rounded-lg border border-[#D9E0DC] bg-white p-5 space-y-2">
            <SectionHeader title="Perlu Tindak Lanjut" />
            <div className="divide-y divide-[#EAEFEA]">
              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#141B17]">
                    Antrean Verifikasi Fisik
                  </p>
                  <p className="text-[11px] text-[#58655E]">
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
              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#141B17]">
                    Pengajuan Distribusi Mitra
                  </p>
                  <p className="text-[11px] text-[#58655E]">
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
              <div className="flex items-center justify-between gap-3 pt-3">
                <div>
                  <p className="text-xs font-semibold text-[#141B17]">
                    Penukaran Reward Kontributor
                  </p>
                  <p className="text-[11px] text-[#58655E]">
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

          <div className="rounded-lg border border-[#D9E0DC] bg-white p-5">
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
        <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white p-4 sm:px-5">
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
