import { Eye } from 'lucide-react';
import type { EcobrickSubmission, TracecoState } from '../types/traceco';
import {
  computeActiveContributorBreakdown,
  computePlatformMetrics,
} from '../utils/tracecoLogic';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
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

interface EcoMonitorPageProps {
  state: TracecoState;
  onInspectTarget: (targetId: string) => void;
  onOpenTraceDetail?: (targetId: string) => void;
}

export function EcoMonitorPage({
  state,
  onInspectTarget,
  onOpenTraceDetail,
}: EcoMonitorPageProps) {
  const metrics = computePlatformMetrics(state);
  const contributorBreakdown = computeActiveContributorBreakdown(state);
  const contributorMap = new Map(state.contributors.map((c) => [c.id, c]));
  const verificationMap = new Map(
    state.verification_records.map((v) => [v.submissionId, v])
  );

  const openDetail = (id: string) => {
    if (onOpenTraceDetail) {
      onOpenTraceDetail(id);
    } else {
      onInspectTarget(id);
    }
  };

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
              onClick={() => openDetail(s.submissionId)}
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
            {ctr && <RoleTag role={ctr.role} />}
          </div>
        );
      },
    },
    {
      key: 'submitted',
      header: 'Submitted',
      align: 'right',
      render: (s) => (
        <span className="font-mono text-xs tabular-nums whitespace-nowrap">
          {s.quantitySubmitted} unit
        </span>
      ),
    },
    {
      key: 'verified',
      header: 'Verified',
      align: 'right',
      render: (s) => (
        <span className="font-mono text-xs font-medium text-[#245C45] tabular-nums whitespace-nowrap">
          {s.verifiedQuantity} unit
        </span>
      ),
    },
    {
      key: 'rejected',
      header: 'Rejected',
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
      header: 'Traceability',
      align: 'right',
      render: (s) => (
        <button
          type="button"
          onClick={() => openDetail(s.submissionId)}
          className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#245C45] hover:bg-[#E7F0E8] transition-colors whitespace-nowrap"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span>Detail</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title="Eco-Monitor & Impact Monitoring"
        description="Pemantauan terukur dari kontribusi ecobrick, tingkat verifikasi, partisipasi sosial, hingga pemanfaatan nyata."
      />

      <MetricStrip
        columns={5}
        items={[
          {
            label: 'Ecobrick Submitted',
            value: `${metrics.ecobricksSubmittedCount} unit`,
            hint: `${metrics.totalSubmissionsCount} berkas`,
          },
          {
            label: 'Ecobrick Verified',
            value: `${metrics.ecobricksVerifiedCount} unit`,
            hint: `${metrics.verificationRatePercent}% terverifikasi`,
            accent: 'primary',
          },
          {
            label: 'Available Inventory',
            value: `${metrics.inventoryAvailableCount} unit`,
            hint: `${metrics.ecobricksReservedCount} reserved`,
          },
          {
            label: 'Ecobrick Distributed',
            value: `${metrics.ecobricksDistributedCount} unit`,
            hint: 'Serah terima ke pemanfaat',
          },
          {
            label: 'Ecobrick Utilized',
            value: `${metrics.ecobricksUtilizedCount} unit`,
            hint: `${state.utilization_records.length} proyek pemanfaatan`,
            accent: 'primary',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-7">
          <ContributionTrendChart
            submissions={state.ecobrick_submissions}
            title="Tren Kontribusi Ekosistem"
            defaultRange="3m"
          />
        </section>
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 lg:col-span-5">
          <ActiveContributorsChart breakdown={contributorBreakdown} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4 lg:col-span-7">
          <SectionHeader title="Perbandingan Tahapan Pipeline Ecobrick" />
          <EcobrickPipelineComparisonChart metrics={metrics} />
        </section>

        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4 lg:col-span-5">
          <SectionHeader title="Komposisi Hasil Verifikasi & Distribusi" />
          <VerificationOutcomeBar metrics={metrics} />
          <div className="pt-2 border-t border-[#EEF2EF]">
            <DistributionUtilizationChart metrics={metrics} />
          </div>
        </section>
      </div>

      <section className="rounded-md border border-[#E3E8E4] bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#252B28]">
              Plastic Diverted in Verified Ecobricks (Konteks Lingkungan)
            </p>
            <p className="text-[11px] text-[#6B756F]">
              Akumulasi berat dari {state.ecobrick_batches.length} batch
              ecobrick terverifikasi
            </p>
          </div>
          <span className="font-mono text-lg font-semibold text-[#245C45] tabular-nums">
            {metrics.plasticDivertedContextKg.toFixed(1)} kg
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Audit Keterlacakan Submission & Batch" />
        <DataTable
          columns={auditColumns}
          rows={state.ecobrick_submissions}
          rowKey={(s) => s.submissionId}
          emptyMessage="Belum ada data submission tercatat."
        />
      </section>
    </div>
  );
}
