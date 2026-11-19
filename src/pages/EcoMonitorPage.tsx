import { useState } from 'react';
import { Eye, Search } from 'lucide-react';
import type {
  AppPageId,
  CollaborationPartner,
  CommunityActivity,
  CommunityPostCategory,
  EcobrickSubmission,
  SubmissionStatus,
  TracecoState,
} from '../types/traceco';
import {
  computeActiveContributorBreakdown,
  computePlatformMetrics,
} from '../utils/tracecoLogic';
import { ActivityItem } from '../components/ui/ActivityItem';
import { SecondaryButton } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { MetricStrip } from '../components/ui/Metric';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import {
  ActiveContributorsChart,
  ContributionTrendChart,
  DistributionUtilizationChart,
  EcobrickPipelineComparisonChart,
  VerificationOutcomeBar,
} from '../components/ui/SimpleCharts';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';
import { SubNavTabs } from '../components/ui/SubNavTabs';
import { CommunityHubPage } from './CommunityHubPage';

interface EcoMonitorPageProps {
  state: TracecoState;
  activeSubTab?: string;
  onChangeSubTab?: (sub: string) => void;
  onNavigate?: (page: AppPageId, sub?: string) => void;
  onInspectTarget: (targetId: string) => void;
  onOpenTraceDetail?: (targetId: string) => void;
  onToggleJoinActivity: (activityId: string) => {
    joined: boolean;
    error?: string;
  };
  onCreateActivity: (payload: {
    title: string;
    category: CommunityActivity['category'];
    date: string;
    location: string;
    participantSummary: string;
    inclusiveParticipationNote: string;
  }) => { error?: string };
  onUpdateActivityStatus: (
    activityId: string,
    status: CommunityActivity['status']
  ) => void;
  onCreatePost: (payload: {
    category: CommunityPostCategory;
    title: string;
    body: string;
  }) => { error?: string };
  onReplyPost: (postId: string, body: string) => { error?: string };
  onTogglePostStatus: (postId: string) => void;
  onCreateCollaboration: (payload: {
    partnerName: string;
    collaborationType: string;
    activity: string;
  }) => { error?: string };
  onUpdateCollaborationStatus: (
    collaborationId: string,
    status: CollaborationPartner['status']
  ) => void;
}

export function EcoMonitorPage({
  state,
  activeSubTab = 'trends',
  onChangeSubTab = () => {},
  onNavigate = () => {},
  onInspectTarget,
  onOpenTraceDetail,
  onToggleJoinActivity,
  onCreateActivity,
  onUpdateActivityStatus,
  onCreatePost,
  onReplyPost,
  onTogglePostStatus,
  onCreateCollaboration,
  onUpdateCollaborationStatus,
}: EcoMonitorPageProps) {
  const [showCommunityHub, setShowCommunityHub] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState<
    'Semua' | SubmissionStatus
  >('Semua');

  const metrics = computePlatformMetrics(state);
  const contributorBreakdown = computeActiveContributorBreakdown(state);
  const contributorMap = new Map(state.contributors.map((c) => [c.id, c]));
  const verificationMap = new Map(
    state.verification_records.map((v) => [v.submissionId, v])
  );

  const currentTab =
    activeSubTab === 'users' || activeSubTab === 'utilization'
      ? activeSubTab
      : 'trends';

  const openDetail = (id: string) => {
    if (onOpenTraceDetail) {
      onOpenTraceDetail(id);
    } else {
      onInspectTarget(id);
    }
  };

  const filteredSubmissions = state.ecobrick_submissions.filter((s) => {
    const matchStatus =
      auditStatusFilter === 'Semua' || s.status === auditStatusFilter;
    const ctr = contributorMap.get(s.contributorId);
    const ver = verificationMap.get(s.submissionId);
    const q = auditSearch.trim().toLowerCase();
    const matchQuery =
      !q ||
      s.submissionId.toLowerCase().includes(q) ||
      (ver?.batchId ?? '').toLowerCase().includes(q) ||
      (ctr?.name ?? '').toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const auditColumns: DataTableColumn<EcobrickSubmission>[] = [
    {
      key: 'submissionId',
      header: 'Submission & Batch',
      render: (s) => {
        const ver = verificationMap.get(s.submissionId);
        return (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openDetail(s.submissionId);
              }}
              className="font-mono text-xs font-semibold text-[#245C45] hover:underline"
            >
              {s.submissionId}
            </button>
            {ver?.batchId && (
              <p className="font-mono text-[11px] text-[#6B756F]">
                Batch {ver.batchId}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'contributor',
      header: 'Kontributor',
      render: (s) => {
        const ctr = contributorMap.get(s.contributorId);
        return (
          <div className="space-y-0.5 text-xs">
            <p className="font-medium text-[#252B28]">{ctr?.name ?? '-'}</p>
            {ctr && <RoleTag role={ctr.role} segment={ctr.segment} />}
          </div>
        );
      },
    },
    {
      key: 'submitted',
      header: 'Diserahkan',
      align: 'right',
      render: (s) => (
        <span className="font-mono text-xs tabular-nums whitespace-nowrap">
          {s.quantitySubmitted} unit
        </span>
      ),
    },
    {
      key: 'verified',
      header: 'Terverifikasi',
      align: 'right',
      render: (s) => (
        <span className="font-mono text-xs font-medium text-[#245C45] tabular-nums whitespace-nowrap">
          {s.verifiedQuantity} unit
        </span>
      ),
    },
    {
      key: 'rejected',
      header: 'Ditolak',
      align: 'right',
      render: (s) => (
        <span className="font-mono text-xs text-[#991B1B] tabular-nums whitespace-nowrap">
          {s.rejectedQuantity} unit
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusTag status={s.status} />,
    },
    {
      key: 'trace',
      header: 'Lacak',
      align: 'right',
      render: (s) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(s.submissionId);
          }}
          className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#245C45] transition-colors hover:bg-[#E7F0E8] active:scale-[0.985] whitespace-nowrap"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span>Detail</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring"
        description="Pemantauan tren kontribusi ecobrick, partisipasi pengguna & komunitas, serta pemanfaatan nyata."
      />

      <MetricStrip
        columns={4}
        items={[
          {
            label: 'Ecobrick Diserahkan',
            value: `${metrics.ecobricksSubmittedCount} unit`,
            hint: `${metrics.totalSubmissionsCount} berkas`,
          },
          {
            label: 'Terverifikasi',
            value: `${metrics.ecobricksVerifiedCount} unit`,
            hint: `${metrics.verificationRatePercent}% tingkat lolos`,
            accent: 'primary',
          },
          {
            label: 'Didistribusikan',
            value: `${metrics.ecobricksDistributedCount} unit`,
            hint: `${metrics.inventoryAvailableCount} tersedia di stok`,
          },
          {
            label: 'Dimanfaatkan',
            value: `${metrics.ecobricksUtilizedCount} unit`,
            hint: `${state.utilization_records.length} proyek selesai`,
            accent: 'primary',
          },
        ]}
      />

      <SubNavTabs
        ariaLabel="Submenu Monitoring"
        activeId={currentTab}
        onChange={onChangeSubTab}
        items={[
          { id: 'trends', label: 'Tren Kontribusi' },
          {
            id: 'users',
            label: 'Aktivitas Pengguna',
            badge: state.recent_activities.length,
          },
          { id: 'utilization', label: 'Pemanfaatan Ecobrick' },
        ]}
      />

      {currentTab === 'trends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-7">
              <ContributionTrendChart
                submissions={state.ecobrick_submissions}
                title="Tren Kontribusi Ekosistem"
                defaultRange="3m"
              />
            </section>
            <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-5 lg:col-span-5">
              <SectionHeader title="Komposisi Hasil Verifikasi" />
              <VerificationOutcomeBar metrics={metrics} />
              <div className="border-t border-[#EEF2EF] pt-4 space-y-1">
                <p className="text-xs font-medium text-[#6B756F]">
                  Konteks Lingkungan (Ecobrick Terverifikasi)
                </p>
                <p className="font-display text-2xl font-semibold text-[#245C45] tabular-nums">
                  {metrics.plasticDivertedContextKg.toFixed(1)} kg
                </p>
                <p className="text-[11px] text-[#6B756F]">
                  Akumulasi berat plastik terkemas dari{' '}
                  {state.ecobrick_batches.length} batch terverifikasi.
                </p>
              </div>
            </section>
          </div>
        </div>
      )}

      {currentTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-5">
              <ActiveContributorsChart breakdown={contributorBreakdown} />
            </section>

            <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-3 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionHeader
                  title="Aktivitas Ekosistem Terbaru"
                  description="Ringkasan aktivitas kontribusi, verifikasi, reward, dan agenda."
                />
                <SecondaryButton
                  size="sm"
                  onClick={() => setShowCommunityHub((v) => !v)}
                >
                  {showCommunityHub
                    ? 'Tutup Koordinasi Community Hub'
                    : 'Kelola Community Hub'}
                </SecondaryButton>
              </div>

              <div className="divide-y divide-[#EEF2EF]">
                {state.recent_activities.slice(0, 6).map((act) => (
                  <ActivityItem
                    key={act.id}
                    item={act}
                    onInspectBatch={(id) => openDetail(id)}
                  />
                ))}
              </div>
            </section>
          </div>

          {showCommunityHub && (
            <div className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4">
              <SectionHeader
                title="Koordinasi Community Hub"
                description="Kelola agenda komunitas, moderasi forum tanya-jawab, uji kelayakan, dan kemitraan."
              />
              <CommunityHubPage
                state={state}
                embedded
                onNavigate={(page) => onNavigate(page)}
                onToggleJoinActivity={onToggleJoinActivity}
                onCreateActivity={onCreateActivity}
                onUpdateActivityStatus={onUpdateActivityStatus}
                onCreatePost={onCreatePost}
                onReplyPost={onReplyPost}
                onTogglePostStatus={onTogglePostStatus}
                onCreateCollaboration={onCreateCollaboration}
                onUpdateCollaborationStatus={onUpdateCollaborationStatus}
              />
            </div>
          )}
        </div>
      )}

      {currentTab === 'utilization' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4 lg:col-span-7">
              <SectionHeader title="Perbandingan Tahapan Pipeline Ecobrick" />
              <EcobrickPipelineComparisonChart metrics={metrics} />
            </section>

            <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4 lg:col-span-5">
              <SectionHeader title="Distribusi & Pemanfaatan" />
              <DistributionUtilizationChart metrics={metrics} />
            </section>
          </div>

          <section className="space-y-3">
            <SectionHeader title="Audit Keterlacakan Submission & Batch" />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E3E8E4] bg-white px-4 py-3">
              <FilterBar
                ariaLabel="Filter status submission audit"
                value={auditStatusFilter}
                onChange={setAuditStatusFilter}
                options={[
                  {
                    value: 'Semua',
                    label: 'Semua',
                    count: state.ecobrick_submissions.length,
                  },
                  {
                    value: 'Verified',
                    label: 'Terverifikasi',
                    count: state.ecobrick_submissions.filter(
                      (s) => s.status === 'Verified'
                    ).length,
                  },
                  {
                    value: 'Partially Verified',
                    label: 'Sebagian',
                    count: state.ecobrick_submissions.filter(
                      (s) => s.status === 'Partially Verified'
                    ).length,
                  },
                  {
                    value: 'Pending',
                    label: 'Menunggu',
                    count: state.ecobrick_submissions.filter(
                      (s) => s.status === 'Pending'
                    ).length,
                  },
                ]}
              />

              <div className="relative w-full sm:w-64">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#6B756F]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Cari ID submission, batch, atau kontributor"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Cari ID, batch, atau nama..."
                  className="w-full rounded border border-[#CFD8D2] bg-[#F7F9F7] py-1.5 pr-3 pl-8 text-xs text-[#252B28] placeholder:text-[#8A948E] transition-colors focus:border-[#245C45] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Mobile Cards (< md) */}
            <div className="space-y-3 md:hidden">
              {filteredSubmissions.map((s) => {
                const ctr = contributorMap.get(s.contributorId);
                const ver = verificationMap.get(s.submissionId);
                return (
                  <div
                    key={s.submissionId}
                    className="rounded-md border border-[#E3E8E4] bg-white p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#245C45]">
                          {s.submissionId}
                          {ver?.batchId ? ` · ${ver.batchId}` : ''}
                        </p>
                        <p className="text-xs font-medium text-[#252B28]">
                          {ctr?.name ?? '-'}
                        </p>
                      </div>
                      <StatusTag status={s.status} />
                    </div>
                    <div className="flex items-center justify-between border-t border-[#EEF2EF] pt-2 text-xs">
                      <span className="font-mono text-[#6B756F]">
                        {s.verifiedQuantity}/{s.quantitySubmitted} unit lolos
                      </span>
                      <SecondaryButton
                        size="sm"
                        onClick={() => openDetail(s.submissionId)}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Detail</span>
                      </SecondaryButton>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <DataTable
                columns={auditColumns}
                rows={filteredSubmissions}
                rowKey={(s) => s.submissionId}
                onRowClick={(s) => openDetail(s.submissionId)}
                emptyMessage="Tidak ada data submission yang cocok dengan filter."
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
