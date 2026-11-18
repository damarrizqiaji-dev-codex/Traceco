import { useState } from 'react';
import { Award, CheckCircle2, Info } from 'lucide-react';
import type {
  FinancialIncentive,
  GreenPointEntry,
  IncentiveStatus,
  RedemptionStatus,
  RewardRedemption,
  TracecoState,
} from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
  computeContributorPointsBalance,
  isAdminRole,
  isPenyerahRole,
} from '../utils/tracecoLogic';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { MetricStrip } from '../components/ui/Metric';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';

interface GreenRewardPageProps {
  state: TracecoState;
  onRedeemReward: (params: {
    contributorId: string;
    rewardId: string;
  }) => { error?: string };
  onUpdateRedemptionStatus: (
    redemptionId: string,
    status: RedemptionStatus
  ) => void;
  onUpdateIncentiveStatus: (
    incentiveId: string,
    status: IncentiveStatus
  ) => void;
}

export function GreenRewardPage({
  state,
  onRedeemReward,
  onUpdateRedemptionStatus,
  onUpdateIncentiveStatus,
}: GreenRewardPageProps) {
  const isPenyerah = isPenyerahRole(state.activeRole);
  const canManageRewards = isAdminRole(state.activeRole);
  const activeActorId = state.activeActorIdByRole[state.activeRole];

  const participantContributors = state.contributors.filter((c) =>
    isPenyerahRole(c.role)
  );

  const [selectedContributorId, setSelectedContributorId] = useState(
    isPenyerah ? activeActorId : participantContributors[0]?.id ?? 'CTR-SAN-01'
  );

  const effectiveContributorId = isPenyerah
    ? activeActorId
    : selectedContributorId;

  const activeContributor = state.contributors.find(
    (c) => c.id === effectiveContributorId
  );

  const balanceSummary = computeContributorPointsBalance(
    state,
    effectiveContributorId
  );

  const [redeemFeedback, setRedeemFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const contributorMap = new Map(state.contributors.map((c) => [c.id, c]));

  const handleRedeem = (rewardId: string, title: string) => {
    setRedeemFeedback(null);
    const res = onRedeemReward({
      contributorId: effectiveContributorId,
      rewardId,
    });
    if (res.error) {
      setRedeemFeedback({ type: 'err', text: res.error });
    } else {
      setRedeemFeedback({
        type: 'ok',
        text: `Permintaan penukaran "${title}" dicatat (status: Pending) untuk diproses oleh Admin Pesantren.`,
      });
    }
  };

  const visiblePointsEntries = isPenyerah
    ? state.green_points.filter(
        (g) => g.contributorId === effectiveContributorId
      )
    : state.green_points;

  const visibleRedemptions = isPenyerah
    ? state.redemptions.filter(
        (r) => r.contributorId === effectiveContributorId
      )
    : state.redemptions;

  const visibleIncentives = isPenyerah
    ? state.financial_incentives.filter(
        (f) => f.contributorId === effectiveContributorId
      )
    : state.financial_incentives;

  const redemptionColumns: DataTableColumn<RewardRedemption>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#245C45]">
          {r.id}
        </span>
      ),
    },
    {
      key: 'contributor',
      header: 'Kontributor',
      render: (r) => {
        const ctr = contributorMap.get(r.contributorId);
        return (
          <div className="space-y-0.5 text-xs">
            <p className="font-medium text-[#252B28]">{ctr?.name ?? '-'}</p>
            {ctr && <RoleTag role={ctr.role} />}
          </div>
        );
      },
    },
    {
      key: 'reward',
      header: 'Item Reward',
      render: (r) => (
        <span className="text-xs text-[#252B28]">{r.rewardTitle}</span>
      ),
    },
    {
      key: 'points',
      header: 'Poin',
      align: 'right',
      render: (r) => (
        <span className="font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
          {r.pointsCost} pts
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Tanggal',
      render: (r) => (
        <span className="font-mono text-xs text-[#6B756F] tabular-nums whitespace-nowrap">
          {r.requestedAt}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusTag status={r.status} />,
    },
    ...(canManageRewards
      ? [
          {
            key: 'actions',
            header: 'Aksi Admin',
            align: 'right' as const,
            render: (r: RewardRedemption) => (
              <div className="inline-flex items-center justify-end gap-1.5">
                {r.status === 'Pending' && (
                  <SecondaryButton
                    size="sm"
                    onClick={() => onUpdateRedemptionStatus(r.id, 'Approved')}
                  >
                    Setujui
                  </SecondaryButton>
                )}
                {r.status === 'Approved' && (
                  <PrimaryButton
                    size="sm"
                    onClick={() => onUpdateRedemptionStatus(r.id, 'Completed')}
                  >
                    Selesaikan
                  </PrimaryButton>
                )}
                {r.status === 'Completed' && (
                  <span className="text-[11px] text-[#6B756F]">Selesai</span>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const pointsColumns: DataTableColumn<GreenPointEntry>[] = [
    {
      key: 'date',
      header: 'Tanggal',
      render: (g) => (
        <span className="font-mono text-xs text-[#6B756F] tabular-nums whitespace-nowrap">
          {g.date}
        </span>
      ),
    },
    {
      key: 'contributor',
      header: 'Kontributor',
      render: (g) => {
        const ctr = contributorMap.get(g.contributorId);
        return (
          <span className="text-xs font-medium text-[#252B28]">
            {ctr?.name ?? '-'}
          </span>
        );
      },
    },
    {
      key: 'source',
      header: 'Sumber & Referensi',
      render: (g) => (
        <div className="text-xs">
          <p className="text-[#252B28]">{g.sourceLabel}</p>
          {g.submissionId && (
            <p className="font-mono text-[11px] text-[#6B756F]">
              {g.submissionId}
              {g.batchId ? ` · ${g.batchId}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Jenis',
      render: (g) => (
        <span
          className={`text-xs font-medium ${
            g.type === 'Earned' ? 'text-[#245C45]' : 'text-[#92400E]'
          }`}
        >
          {g.type}
        </span>
      ),
    },
    {
      key: 'points',
      header: 'Poin',
      align: 'right',
      render: (g) => (
        <span
          className={`font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
            g.type === 'Earned' ? 'text-[#245C45]' : 'text-[#991B1B]'
          }`}
        >
          {g.type === 'Earned' ? `+${g.points}` : `-${g.points}`} pts
        </span>
      ),
    },
  ];

  const incentiveColumns: DataTableColumn<FinancialIncentive>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (f) => (
        <span className="font-mono text-xs font-semibold text-[#245C45]">
          {f.id}
        </span>
      ),
    },
    {
      key: 'contributor',
      header: 'Penerima',
      render: (f) => {
        const ctr = contributorMap.get(f.contributorId);
        return (
          <div className="space-y-0.5 text-xs">
            <p className="font-medium text-[#252B28]">{ctr?.name ?? '-'}</p>
            {ctr && <RoleTag role={ctr.role} />}
          </div>
        );
      },
    },
    {
      key: 'batch',
      header: 'Batch',
      render: (f) => (
        <span className="font-mono text-xs text-[#6B756F]">{f.batchId}</span>
      ),
    },
    {
      key: 'source',
      header: 'Sumber & Ketentuan',
      render: (f) => (
        <div className="max-w-sm text-xs">
          <p className="font-medium text-[#252B28]">{f.fundingSource}</p>
          <p className="text-[11px] text-[#6B756F]">{f.conditionNote}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Nominal',
      align: 'right',
      render: (f) => (
        <span className="font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
          Rp {f.amountIdr.toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (f) => <StatusTag status={f.status} />,
    },
    ...(canManageRewards
      ? [
          {
            key: 'action',
            header: 'Aksi Admin',
            align: 'right' as const,
            render: (f: FinancialIncentive) => (
              <div className="inline-flex gap-1.5">
                {f.status === 'Pending' && (
                  <SecondaryButton
                    size="sm"
                    onClick={() => onUpdateIncentiveStatus(f.id, 'Approved')}
                  >
                    Setujui
                  </SecondaryButton>
                )}
                {f.status === 'Approved' && (
                  <PrimaryButton
                    size="sm"
                    onClick={() => onUpdateIncentiveStatus(f.id, 'Paid')}
                  >
                    Tandai Paid
                  </PrimaryButton>
                )}
                {f.status === 'Paid' && (
                  <span className="text-[11px] text-[#6B756F]">Selesai</span>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title="Green Reward"
        description={`Setiap 1 ecobrick terverifikasi menghasilkan +${POINTS_PER_ECOBRICK} Green Points internal non-kripto.`}
        actions={
          !isPenyerah && (
            <div className="w-full sm:w-72">
              <FormField
                id="reward-contributor-select"
                label="Lihat Saldo Kontributor"
              >
                <select
                  id="reward-contributor-select"
                  value={selectedContributorId}
                  onChange={(e) => {
                    setSelectedContributorId(e.target.value);
                    setRedeemFeedback(null);
                  }}
                  className={fieldInputClass}
                >
                  {participantContributors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          )
        }
      />

      <MetricStrip
        columns={4}
        items={[
          {
            label: `Green Points Balance (${activeContributor?.name ?? '-'})`,
            value: `${balanceSummary.balance} pts`,
            hint: 'Dapat ditukar di katalog reward',
            accent: 'primary',
          },
          {
            label: 'Total Poin Diperoleh',
            value: `${balanceSummary.earned} pts`,
            hint: `+${POINTS_PER_ECOBRICK} pts per ecobrick terverifikasi`,
          },
          {
            label: 'Total Poin Ditukar',
            value: `${balanceSummary.redeemed} pts`,
            hint: 'Total penukaran reward',
            accent: 'muted',
          },
          {
            label: 'Penukaran Aktif',
            value: `${
              visibleRedemptions.filter((r) => r.status !== 'Completed').length
            } permintaan`,
            hint: 'Pending → Approved → Completed',
          },
        ]}
      />

      {redeemFeedback && (
        <div
          role={redeemFeedback.type === 'err' ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-md border px-4 py-3 text-xs font-medium ${
            redeemFeedback.type === 'ok'
              ? 'border-[#C6DBC9] bg-[#E7F0E8] text-[#245C45]'
              : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
          }`}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{redeemFeedback.text}</span>
        </div>
      )}

      {/* 1. Reward Catalog */}
      <section className="space-y-3">
        <SectionHeader title="1. Katalog Penukaran Green Points" />

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E3E8E4] bg-[#E3E8E4] md:grid-cols-2">
          {state.rewards.map((item) => {
            const enough = balanceSummary.balance >= item.pointsCost;
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 bg-white p-5"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-[#4F8A68]">
                        {item.category}
                      </p>
                      <h3 className="text-sm font-semibold text-[#252B28]">
                        {item.title}
                      </h3>
                    </div>
                    <span className="rounded border border-[#C6DBC9] bg-[#E7F0E8] px-2 py-0.5 font-mono text-xs font-semibold text-[#245C45] whitespace-nowrap">
                      {item.pointsCost} pts
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#6B756F]">
                    {item.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF2EF] pt-3">
                  <span className="text-[11px] text-[#6B756F]">
                    {item.stockNote}
                  </span>
                  {isPenyerah ? (
                    <PrimaryButton
                      size="sm"
                      disabled={!enough}
                      onClick={() => handleRedeem(item.id, item.title)}
                    >
                      <Award className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {enough ? 'Tukar Poin' : 'Poin Belum Cukup'}
                      </span>
                    </PrimaryButton>
                  ) : (
                    <span className="text-[11px] font-medium text-[#6B756F]">
                      Penukaran diajukan kontributor
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Redemption Status Ledger */}
      <section className="space-y-3">
        <SectionHeader title="2. Status Penukaran Reward" />
        <DataTable
          columns={redemptionColumns}
          rows={visibleRedemptions}
          rowKey={(r) => r.id}
          emptyMessage="Belum ada permintaan penukaran Green Points."
        />
      </section>

      {/* 3. Points History */}
      <section className="space-y-3">
        <SectionHeader title="3. Riwayat Perolehan & Penukaran Poin" />
        <DataTable
          columns={pointsColumns}
          rows={visiblePointsEntries}
          rowKey={(g) => g.id}
          emptyMessage="Belum ada mutasi poin tercatat."
        />
      </section>

      {/* 4. Conditional Financial Incentives */}
      <section className="space-y-3">
        <SectionHeader title="4. Insentif Finansial Bersyarat" />

        <div className="flex items-start gap-2.5 rounded-md border border-[#E5D3B3] bg-[#FFFBEB] p-3.5 text-xs text-[#92400E]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Insentif finansial bersifat bersyarat dan selektif (terutama untuk
            Keluarga Rentan dan warga aktif) sesuai ketersediaan dana program
            pesantren & mitra.
          </p>
        </div>

        <DataTable
          columns={incentiveColumns}
          rows={visibleIncentives}
          rowKey={(f) => f.id}
          emptyMessage="Belum ada catatan insentif finansial bersyarat."
        />
      </section>
    </div>
  );
}
