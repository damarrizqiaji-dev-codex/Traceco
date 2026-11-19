import { useState } from 'react';
import { Award, CheckCircle2, Info, Search, ShieldCheck } from 'lucide-react';
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
import { FilterBar } from '../components/ui/FilterBar';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { MetricStrip } from '../components/ui/Metric';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';
import { SubNavTabs } from '../components/ui/SubNavTabs';

const BOTTLE_STANDARD_RULES = [
  { label: 'Botol PET 600 ml', minUnitKg: 0.25, targetUnitKg: 0.27 },
  { label: 'Botol PET 1000 ml', minUnitKg: 0.4, targetUnitKg: 0.42 },
  { label: 'Botol PET 1500 ml', minUnitKg: 0.5, targetUnitKg: 0.52 },
];

interface GreenRewardPageProps {
  state: TracecoState;
  activeSubTab?: string;
  onChangeSubTab?: (sub: string) => void;
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
  activeSubTab = 'points',
  onChangeSubTab = () => {},
  onUpdateRedemptionStatus,
  onUpdateIncentiveStatus,
}: GreenRewardPageProps) {
  const canManageRewards = isAdminRole(state.activeRole);
  const participantContributors = state.contributors.filter((c) =>
    isPenyerahRole(c.role)
  );

  const [selectedContributorId, setSelectedContributorId] = useState(
    participantContributors[0]?.id ?? 'CTR-SAN-01'
  );
  const [redemptionFilter, setRedemptionFilter] = useState<
    'Semua' | RedemptionStatus
  >('Semua');
  const [redemptionSearch, setRedemptionSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const currentTab =
    activeSubTab === 'policy' || activeSubTab === 'history'
      ? activeSubTab
      : 'points';

  const activeContributor = state.contributors.find(
    (c) => c.id === selectedContributorId
  );

  const selectedBalance = computeContributorPointsBalance(
    state,
    selectedContributorId
  );

  const totalEarnedEcosystem = state.green_points
    .filter((g) => g.type === 'Earned')
    .reduce((s, g) => s + g.points, 0);
  const totalRedeemedEcosystem = state.green_points
    .filter((g) => g.type === 'Redeemed')
    .reduce((s, g) => s + g.points, 0);
  const pendingRedemptions = state.redemptions.filter(
    (r) => r.status !== 'Completed'
  );

  const contributorMap = new Map(state.contributors.map((c) => [c.id, c]));

  const filteredRedemptions = state.redemptions.filter((r) => {
    const matchStatus =
      redemptionFilter === 'Semua' || r.status === redemptionFilter;
    const ctr = contributorMap.get(r.contributorId);
    const q = redemptionSearch.trim().toLowerCase();
    const matchQuery =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.rewardTitle.toLowerCase().includes(q) ||
      (ctr?.name ?? '').toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const filteredLedger = state.green_points.filter((g) => {
    const ctr = contributorMap.get(g.contributorId);
    const q = ledgerSearch.trim().toLowerCase();
    return (
      !q ||
      g.sourceLabel.toLowerCase().includes(q) ||
      (ctr?.name ?? '').toLowerCase().includes(q) ||
      (g.submissionId ?? '').toLowerCase().includes(q) ||
      (g.batchId ?? '').toLowerCase().includes(q)
    );
  });

  const handleRedemptionAction = (id: string, nextStatus: RedemptionStatus) => {
    onUpdateRedemptionStatus(id, nextStatus);
    setStatusFeedback(`Status penukaran ${id} diperbarui menjadi ${nextStatus}.`);
  };

  const handleIncentiveAction = (id: string, nextStatus: IncentiveStatus) => {
    onUpdateIncentiveStatus(id, nextStatus);
    setStatusFeedback(`Status insentif ${id} diperbarui menjadi ${nextStatus}.`);
  };

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
            {ctr && <RoleTag role={ctr.role} segment={ctr.segment} />}
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
          {r.pointsCost} GP
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
                    onClick={() => handleRedemptionAction(r.id, 'Approved')}
                  >
                    Setujui
                  </SecondaryButton>
                )}
                {r.status === 'Approved' && (
                  <PrimaryButton
                    size="sm"
                    onClick={() => handleRedemptionAction(r.id, 'Completed')}
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
          <div className="space-y-0.5 text-xs">
            <p className="font-medium text-[#252B28]">{ctr?.name ?? '-'}</p>
            {ctr && <RoleTag role={ctr.role} segment={ctr.segment} />}
          </div>
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
      key: 'points',
      header: 'Mutasi',
      align: 'right',
      render: (g) => (
        <span
          className={`font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
            g.type === 'Earned' ? 'text-[#245C45]' : 'text-[#991B1B]'
          }`}
        >
          {g.type === 'Earned' ? `+${g.points}` : `-${g.points}`} GP
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
            {ctr && <RoleTag role={ctr.role} segment={ctr.segment} />}
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
                    onClick={() => handleIncentiveAction(f.id, 'Approved')}
                  >
                    Setujui
                  </SecondaryButton>
                )}
                {f.status === 'Approved' && (
                  <PrimaryButton
                    size="sm"
                    onClick={() => handleIncentiveAction(f.id, 'Paid')}
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
    <div className="space-y-6">
      <PageHeader
        title="Reward"
        description={`Pengelolaan Green Points internal (+${POINTS_PER_ECOBRICK} GP/unit terverifikasi), kebijakan reward, dan persetujuan penukaran.`}
      />

      <SubNavTabs
        ariaLabel="Submenu Reward"
        activeId={currentTab}
        onChange={onChangeSubTab}
        items={[
          {
            id: 'points',
            label: 'Green Points',
            badge: pendingRedemptions.length,
          },
          { id: 'policy', label: 'Kebijakan Reward' },
          {
            id: 'history',
            label: 'Riwayat Reward',
            badge: state.green_points.length,
          },
        ]}
      />

      {statusFeedback && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-[#C6DBC9] bg-[#E7F0E8] px-4 py-3 text-xs font-medium text-[#245C45]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {currentTab === 'points' && (
        <div className="space-y-6">
          <MetricStrip
            columns={4}
            items={[
              {
                label: 'Total Poin Diterbitkan',
                value: `${totalEarnedEcosystem} GP`,
                hint: 'Akumulasi dari unit terverifikasi',
                accent: 'primary',
              },
              {
                label: 'Total Poin Ditukar',
                value: `${totalRedeemedEcosystem} GP`,
                hint: `${state.redemptions.length} transaksi penukaran`,
              },
              {
                label: 'Penukaran Perlu Proses',
                value: `${pendingRedemptions.length} item`,
                hint: 'Menunggu persetujuan / selesai',
                accent: pendingRedemptions.length > 0 ? 'primary' : 'muted',
              },
              {
                label: 'Insentif Bersyarat',
                value: `${state.financial_incentives.length} program`,
                hint: 'Dukungan dana sosial & mitra',
              },
            ]}
          />

          {/* Inspect Contributor Balance (Clean Hairline Grid, no nested cards) */}
          <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionHeader
                  title="Cek Saldo Green Points Kontributor"
                  description="Tinjau perolehan dan sisa saldo poin masing-masing kontributor."
                />
              </div>
              <div className="w-full sm:w-72">
                <FormField
                  id="reward-contributor-select"
                  label="Pilih Kontributor"
                >
                  <select
                    id="reward-contributor-select"
                    value={selectedContributorId}
                    onChange={(e) => setSelectedContributorId(e.target.value)}
                    className={fieldInputClass}
                  >
                    {participantContributors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.segment ?? c.role})
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-[#EEF2EF] border-t border-[#EEF2EF] pt-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="py-2 sm:pr-4 sm:py-0">
                <p className="text-[11px] font-medium text-[#6B756F]">
                  Saldo Tersedia ({activeContributor?.name ?? '-'})
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-[#245C45] tabular-nums">
                  {selectedBalance.balance} GP
                </p>
              </div>
              <div className="py-2 sm:px-5 sm:py-0">
                <p className="text-[11px] font-medium text-[#6B756F]">
                  Total Diperoleh
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-[#252B28] tabular-nums">
                  +{selectedBalance.earned} GP
                </p>
              </div>
              <div className="py-2 sm:pl-5 sm:py-0">
                <p className="text-[11px] font-medium text-[#6B756F]">
                  Total Ditukar
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-[#6B756F] tabular-nums">
                  -{selectedBalance.redeemed} GP
                </p>
              </div>
            </div>
          </section>

          {/* Redemptions Approval Queue */}
          <section className="space-y-3">
            <SectionHeader
              title="Antrean Penukaran Green Marketplace"
              description="Setujui atau selesaikan permintaan penukaran reward dari kontributor."
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E3E8E4] bg-white px-4 py-3">
              <FilterBar
                ariaLabel="Filter status penukaran"
                value={redemptionFilter}
                onChange={setRedemptionFilter}
                options={[
                  {
                    value: 'Semua',
                    label: 'Semua',
                    count: state.redemptions.length,
                  },
                  {
                    value: 'Pending',
                    label: 'Pending',
                    count: state.redemptions.filter(
                      (r) => r.status === 'Pending'
                    ).length,
                  },
                  {
                    value: 'Approved',
                    label: 'Approved',
                    count: state.redemptions.filter(
                      (r) => r.status === 'Approved'
                    ).length,
                  },
                  {
                    value: 'Completed',
                    label: 'Completed',
                    count: state.redemptions.filter(
                      (r) => r.status === 'Completed'
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
                  aria-label="Cari ID penukaran, nama, atau reward"
                  value={redemptionSearch}
                  onChange={(e) => setRedemptionSearch(e.target.value)}
                  placeholder="Cari nama, ID, atau item..."
                  className="w-full rounded border border-[#CFD8D2] bg-[#F7F9F7] py-1.5 pr-3 pl-8 text-xs text-[#252B28] placeholder:text-[#8A948E] transition-colors focus:border-[#245C45] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Mobile Cards (< md) */}
            <div className="space-y-3 md:hidden">
              {filteredRedemptions.length === 0 ? (
                <div className="rounded-md border border-[#E3E8E4] bg-white p-6 text-center text-xs text-[#6B756F]">
                  Tidak ada permintaan penukaran yang cocok.
                </div>
              ) : (
                filteredRedemptions.map((r) => {
                  const ctr = contributorMap.get(r.contributorId);
                  return (
                    <div
                      key={r.id}
                      className="rounded-md border border-[#E3E8E4] bg-white p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs font-semibold text-[#245C45]">
                            {r.id}
                          </p>
                          <p className="text-xs font-medium text-[#252B28]">
                            {r.rewardTitle}
                          </p>
                          <p className="text-[11px] text-[#6B756F]">
                            {ctr?.name ?? '-'} · {r.requestedAt}
                          </p>
                        </div>
                        <StatusTag status={r.status} />
                      </div>
                      <div className="flex items-center justify-between border-t border-[#EEF2EF] pt-2">
                        <span className="font-mono text-xs font-semibold text-[#252B28]">
                          {r.pointsCost} GP
                        </span>
                        {canManageRewards && r.status === 'Pending' && (
                          <SecondaryButton
                            size="sm"
                            onClick={() =>
                              handleRedemptionAction(r.id, 'Approved')
                            }
                          >
                            Setujui
                          </SecondaryButton>
                        )}
                        {canManageRewards && r.status === 'Approved' && (
                          <PrimaryButton
                            size="sm"
                            onClick={() =>
                              handleRedemptionAction(r.id, 'Completed')
                            }
                          >
                            Selesaikan
                          </PrimaryButton>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (md+) */}
            <div className="hidden md:block">
              <DataTable
                columns={redemptionColumns}
                rows={filteredRedemptions}
                rowKey={(r) => r.id}
                emptyMessage="Tidak ada permintaan penukaran Green Points yang cocok."
              />
            </div>
          </section>

          {/* Conditional Financial Incentives */}
          <section className="space-y-3">
            <SectionHeader title="Insentif Finansial Bersyarat" />
            <div className="flex items-start gap-2.5 rounded-md border border-[#E5D3B3] bg-[#FFFBEB] p-3.5 text-xs text-[#92400E]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Insentif finansial bersifat bersyarat dan selektif (terutama
                untuk Keluarga Rentan dan warga aktif) sesuai ketersediaan dana
                program pesantren & mitra.
              </p>
            </div>
            <DataTable
              columns={incentiveColumns}
              rows={state.financial_incentives}
              rowKey={(f) => f.id}
              emptyMessage="Belum ada catatan insentif finansial bersyarat."
            />
          </section>
        </div>
      )}

      {currentTab === 'policy' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#245C45]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Aturan Perolehan Green Points</span>
              </div>
              <ul className="divide-y divide-[#EEF2EF] border-t border-[#EEF2EF] text-xs text-[#252B28]">
                <li className="py-2.5">
                  Setiap <strong>1 ecobrick terverifikasi fisik</strong>{' '}
                  menghasilkan{' '}
                  <strong className="font-mono text-[#245C45]">
                    +{POINTS_PER_ECOBRICK} GP
                  </strong>{' '}
                  secara otomatis.
                </li>
                <li className="py-2.5">
                  Poin tidak dapat diuangkan secara bebas (internal non-kripto),
                  hanya ditukar melalui Green Marketplace atau program sosial.
                </li>
                <li className="py-2.5">
                  Unit berstatus <strong>Ditolak</strong> tidak menghasilkan
                  poin dan tidak masuk ke inventori terverifikasi.
                </li>
              </ul>
            </div>

            <div className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#245C45]">
                <Award className="h-4 w-4" aria-hidden="true" />
                <span>Standar Kelayakan Berat per Ukuran Botol</span>
              </div>
              <div className="divide-y divide-[#EEF2EF] border-t border-[#EEF2EF]">
                {BOTTLE_STANDARD_RULES.map((std) => (
                  <div
                    key={std.label}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <span className="font-medium text-[#252B28]">
                      {std.label}
                    </span>
                    <span className="font-mono text-[#245C45] tabular-nums">
                      Min {std.minUnitKg} kg · Target {std.targetUnitKg} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Katalog Item Green Marketplace Aktif"
              description="Item yang tersedia untuk ditukar oleh Kontributor menggunakan saldo Green Points."
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {state.rewards.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-[#E3E8E4] bg-white p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium text-[#4F8A68]">
                        {item.category}
                      </p>
                      <h3 className="font-display text-sm font-semibold text-[#252B28]">
                        {item.title}
                      </h3>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[#245C45] tabular-nums whitespace-nowrap">
                      {item.pointsCost} GP
                    </span>
                  </div>
                  <p className="text-xs text-[#6B756F]">{item.description}</p>
                  <p className="border-t border-[#EEF2EF] pt-2 text-[11px] text-[#6B756F]">
                    {item.stockNote}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {currentTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeader
              title="Mutasi Green Points Ekosistem"
              description="Seluruh catatan perolehan (+GP) dan penukaran (-GP) di ekosistem TRACECO."
            />
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#6B756F]"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari mutasi Green Points"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Cari kontributor, batch, atau keterangan..."
                className="w-full rounded border border-[#CFD8D2] bg-white py-1.5 pr-3 pl-8 text-xs text-[#252B28] placeholder:text-[#8A948E] transition-colors focus:border-[#245C45] focus:outline-none"
              />
            </div>
          </div>

          {/* Mobile Cards (< md) */}
          <div className="space-y-2.5 md:hidden">
            {filteredLedger.map((g) => {
              const ctr = contributorMap.get(g.contributorId);
              return (
                <div
                  key={g.id}
                  className="rounded-md border border-[#E3E8E4] bg-white p-4 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-[#252B28]">
                        {g.sourceLabel}
                      </p>
                      <p className="text-[11px] text-[#6B756F]">
                        {ctr?.name ?? '-'} · {g.date}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-xs font-semibold whitespace-nowrap ${
                        g.type === 'Earned'
                          ? 'text-[#245C45]'
                          : 'text-[#991B1B]'
                      }`}
                    >
                      {g.type === 'Earned' ? `+${g.points}` : `-${g.points}`} GP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (md+) */}
          <div className="hidden md:block">
            <DataTable
              columns={pointsColumns}
              rows={filteredLedger}
              rowKey={(g) => g.id}
              emptyMessage="Tidak ada mutasi poin yang cocok dengan pencarian."
            />
          </div>
        </div>
      )}
    </div>
  );
}
