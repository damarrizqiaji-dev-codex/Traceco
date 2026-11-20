import { useState, type FormEvent } from 'react';
import {
  Award,
  CheckCircle2,
  Database,
  Info,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import type {
  FinancialIncentive,
  GreenPointEntry,
  IncentiveStatus,
  RedemptionStatus,
  RewardCatalogItem,
  RewardRedemption,
  TracecoState,
} from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
  REWARD_CATALOG_CATEGORIES,
  computeContributorPointsBalance,
  isAdminRole,
  isPenyerahRole,
  type RewardCatalogPayload,
} from '../utils/tracecoLogic';
import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { MetricStrip } from '../components/ui/Metric';
import { Modal } from '../components/ui/Modal';
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
  }) => Promise<{ error?: string }> | { error?: string };
  onUpdateRedemptionStatus: (
    redemptionId: string,
    status: RedemptionStatus
  ) => void;
  onUpdateIncentiveStatus: (
    incentiveId: string,
    status: IncentiveStatus
  ) => void;
  onCreateRewardItem?: (payload: RewardCatalogPayload) => Promise<{ error?: string }>;
  onUpdateRewardItem?: (
    rewardId: string,
    payload: RewardCatalogPayload
  ) => Promise<{ error?: string }>;
  onDeleteRewardItem?: (
    rewardId: string,
    rewardTitle?: string
  ) => Promise<{ error?: string }>;
  onInitializeMasterCatalog?: () => Promise<{ error?: string }>;
}

export function GreenRewardPage({
  state,
  activeSubTab = 'points',
  onChangeSubTab = () => {},
  onUpdateRedemptionStatus,
  onUpdateIncentiveStatus,
  onCreateRewardItem,
  onUpdateRewardItem,
  onDeleteRewardItem,
  onInitializeMasterCatalog,
}: GreenRewardPageProps) {
  const canManageRewards = isAdminRole(state.activeRole);
  const participantContributors = state.contributors.filter((c) =>
    isPenyerahRole(c.role)
  );

  const [selectedContributorId, setSelectedContributorId] = useState(
    participantContributors[0]?.id ?? state.currentUserId ?? ''
  );
  const [redemptionFilter, setRedemptionFilter] = useState<
    'Semua' | RedemptionStatus
  >('Semua');
  const [redemptionSearch, setRedemptionSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const [showAddReward, setShowAddReward] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardCategory, setRewardCategory] = useState<
    RewardCatalogItem['category']
  >(REWARD_CATALOG_CATEGORIES[0]);
  const [rewardPointsCost, setRewardPointsCost] = useState('150');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardStockNote, setRewardStockNote] = useState('');
  const [rewardFormError, setRewardFormError] = useState<string | null>(null);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [initBusy, setInitBusy] = useState(false);

  const [editingReward, setEditingReward] = useState<RewardCatalogItem | null>(
    null
  );
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<
    RewardCatalogItem['category']
  >(REWARD_CATALOG_CATEGORIES[0]);
  const [editPointsCost, setEditPointsCost] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStockNote, setEditStockNote] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deletingReward, setDeletingReward] =
    useState<RewardCatalogItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openEditRewardModal = (item: RewardCatalogItem) => {
    setEditingReward(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditPointsCost(String(item.pointsCost));
    setEditDesc(item.description);
    setEditStockNote(item.stockNote);
    setEditError(null);
  };

  const adjustEditPrice = (delta: number) => {
    const current = parseInt(editPointsCost, 10);
    const base = Number.isFinite(current) && current > 0 ? current : 100;
    const next = Math.min(100000, Math.max(1, base + delta));
    setEditPointsCost(String(next));
  };

  const handleEditRewardSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingReward || !onUpdateRewardItem || editSaving) return;
    setEditError(null);
    const parsedCost = Number(editPointsCost.trim());
    if (
      !Number.isInteger(parsedCost) ||
      parsedCost < 1 ||
      parsedCost > 100000
    ) {
      setEditError(
        'Harga Green Points harus bilangan bulat antara 1 hingga 100.000 GP.'
      );
      return;
    }

    setEditSaving(true);
    try {
      const res = await onUpdateRewardItem(editingReward.id, {
        title: editTitle,
        category: editCategory,
        pointsCost: parsedCost,
        description: editDesc,
        stockNote: editStockNote,
      });
      if (res.error) {
        setEditError(res.error);
        return;
      }
      setStatusFeedback(
        `Perubahan "${editTitle.trim()}" (${parsedCost.toLocaleString('id-ID')} GP) tersimpan ke Green Marketplace.`
      );
      setEditingReward(null);
    } finally {
      setEditSaving(false);
    }
  };

  const handleConfirmDeleteReward = async () => {
    if (!deletingReward || !onDeleteRewardItem || deleteBusy) return;
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      const res = await onDeleteRewardItem(
        deletingReward.id,
        deletingReward.title
      );
      if (res.error) {
        setDeleteError(res.error);
        return;
      }
      setStatusFeedback(
        `Barang "${deletingReward.title}" dihapus dari katalog Green Marketplace.`
      );
      setDeletingReward(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleAddRewardSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onCreateRewardItem || rewardSaving) return;
    setRewardFormError(null);
    const parsedCost = Number(rewardPointsCost.trim());
    if (
      !Number.isInteger(parsedCost) ||
      parsedCost < 1 ||
      parsedCost > 100000
    ) {
      setRewardFormError(
        'Biaya poin harus bilangan bulat antara 1 hingga 100.000 GP.'
      );
      return;
    }
    setRewardSaving(true);
    try {
      const res = await onCreateRewardItem({
        title: rewardTitle,
        category: rewardCategory,
        pointsCost: parsedCost,
        description: rewardDesc,
        stockNote: rewardStockNote,
      });
      if (res.error) {
        setRewardFormError(res.error);
        return;
      }
      setRewardTitle('');
      setRewardDesc('');
      setRewardStockNote('');
      setRewardPointsCost('150');
      setShowAddReward(false);
      setStatusFeedback(
        'Item reward baru berhasil ditambahkan ke Green Marketplace.'
      );
    } finally {
      setRewardSaving(false);
    }
  };

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

  const filteredCatalogRewards = state.rewards.filter((item) => {
    const q = catalogSearch.trim().toLowerCase();
    return (
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.stockNote.toLowerCase().includes(q)
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
      sortValue: (r) => r.id,
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#166549]">
          {r.id}
        </span>
      ),
    },
    {
      key: 'contributor',
      header: 'Kontributor',
      sortValue: (r) => contributorMap.get(r.contributorId)?.name ?? '',
      render: (r) => {
        const ctr = contributorMap.get(r.contributorId);
        return (
          <div className="space-y-0.5 text-xs">
            <p className="font-medium text-[#17201C]">{ctr?.name ?? '-'}</p>
            {ctr && <RoleTag role={ctr.role} segment={ctr.segment} />}
          </div>
        );
      },
    },
    {
      key: 'reward',
      header: 'Item Reward',
      sortValue: (r) => r.rewardTitle,
      render: (r) => (
        <span className="text-xs text-[#17201C]">{r.rewardTitle}</span>
      ),
    },
    {
      key: 'points',
      header: 'Poin',
      align: 'right',
      sortValue: (r) => r.pointsCost,
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#111E19] tabular-nums whitespace-nowrap">
          {r.pointsCost} GP
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Tanggal',
      sortValue: (r) => r.requestedAt,
      render: (r) => (
        <span className="font-mono text-xs text-[#54625B] tabular-nums whitespace-nowrap">
          {r.requestedAt}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
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
                  <span className="text-[11px] text-[#54625B]">Selesai</span>
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
      sortValue: (g) => g.date,
      render: (g) => (
        <span className="font-mono text-xs text-[#54625B] tabular-nums whitespace-nowrap">
          {g.date}
        </span>
      ),
    },
    {
      key: 'contributor',
      header: 'Kontributor',
      sortValue: (g) => contributorMap.get(g.contributorId)?.name ?? '',
      render: (g) => {
        const ctr = contributorMap.get(g.contributorId);
        return (
          <div className="space-y-0.5 text-xs">
            <p className="font-medium text-[#17201C]">{ctr?.name ?? '-'}</p>
            {ctr && <RoleTag role={ctr.role} segment={ctr.segment} />}
          </div>
        );
      },
    },
    {
      key: 'source',
      header: 'Sumber & Referensi',
      sortValue: (g) => g.sourceLabel,
      render: (g) => (
        <div className="text-xs">
          <p className="text-[#17201C]">{g.sourceLabel}</p>
          {g.submissionId && (
            <p className="font-mono text-[11px] text-[#54625B]">
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
      sortValue: (g) => (g.type === 'Earned' ? g.points : -g.points),
      render: (g) => (
        <span
          className={`font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
            g.type === 'Earned' ? 'text-[#166549]' : 'text-[#B91C1C]'
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
      sortValue: (f) => f.id,
      render: (f) => (
        <span className="font-mono text-xs font-semibold text-[#166549]">
          {f.id}
        </span>
      ),
    },
    {
      key: 'contributor',
      header: 'Penerima',
      sortValue: (f) => contributorMap.get(f.contributorId)?.name ?? '',
      render: (f) => {
        const ctr = contributorMap.get(f.contributorId);
        return (
          <div className="space-y-0.5 text-xs">
            <p className="font-medium text-[#17201C]">{ctr?.name ?? '-'}</p>
            {ctr && <RoleTag role={ctr.role} segment={ctr.segment} />}
          </div>
        );
      },
    },
    {
      key: 'batch',
      header: 'Batch',
      sortValue: (f) => f.batchId,
      render: (f) => (
        <span className="font-mono text-xs text-[#1D6373]">{f.batchId}</span>
      ),
    },
    {
      key: 'source',
      header: 'Sumber & Ketentuan',
      sortValue: (f) => f.fundingSource,
      render: (f) => (
        <div className="max-w-sm text-xs">
          <p className="font-medium text-[#17201C]">{f.fundingSource}</p>
          <p className="text-[11px] text-[#54625B]">{f.conditionNote}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Nominal',
      align: 'right',
      sortValue: (f) => f.amountIdr,
      render: (f) => (
        <span className="font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
          Rp {f.amountIdr.toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (f) => f.status,
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
                  <span className="text-[11px] text-[#54625B]">Selesai</span>
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
        title="Reward & Green Marketplace"
        description={`Pengelolaan Green Points internal (+${POINTS_PER_ECOBRICK} GP/unit terverifikasi), harga barang Green Marketplace, dan persetujuan penukaran.`}
        actions={
          canManageRewards && currentTab !== 'policy' ? (
            <SecondaryButton
              size="sm"
              onClick={() => onChangeSubTab('policy')}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kelola Katalog Marketplace ({state.rewards.length})</span>
            </SecondaryButton>
          ) : undefined
        }
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
          {
            id: 'policy',
            label: 'Katalog & Kebijakan',
            badge: state.rewards.length,
          },
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
          className="flex items-start gap-2 rounded-lg border border-[#B5CEC0] bg-[#EBF4EF] px-4 py-3 text-xs font-medium text-[#166549]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
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
                value: `${totalEarnedEcosystem.toLocaleString('id-ID')} GP`,
                hint: 'Akumulasi dari unit terverifikasi',
                accent: 'primary',
              },
              {
                label: 'Total Poin Ditukar',
                value: `${totalRedeemedEcosystem.toLocaleString('id-ID')} GP`,
                hint: `${state.redemptions.length} transaksi penukaran`,
                accent: 'teal',
              },
              {
                label: 'Penukaran Perlu Proses',
                value: `${pendingRedemptions.length} item`,
                hint: 'Menunggu persetujuan / selesai',
                accent: pendingRedemptions.length > 0 ? 'amber' : 'muted',
              },
              {
                label: 'Insentif Bersyarat',
                value: `${state.financial_incentives.length} program`,
                hint: 'Dukungan dana sosial & mitra',
              },
            ]}
          />

          {/* Inspect Contributor Balance (White Header + Deep Obsidian Stats Strip) */}
          <section className="overflow-hidden rounded-lg border border-[#D8DFDA] bg-white">
            <div className="flex flex-wrap items-end justify-between gap-4 p-5">
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

            <div className="grid grid-cols-1 divide-y divide-[#243A31] border-t border-[#243A31] bg-[#111E19] text-[#ECF2EE] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-5">
                <p className="text-[11px] font-medium text-[#9EB5AA]">
                  Saldo Tersedia ({activeContributor?.name ?? '-'})
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-[#6EE7B7] tabular-nums">
                  {selectedBalance.balance.toLocaleString('id-ID')} GP
                </p>
              </div>
              <div className="p-5">
                <p className="text-[11px] font-medium text-[#9EB5AA]">
                  Total Diperoleh
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-white tabular-nums">
                  +{selectedBalance.earned.toLocaleString('id-ID')} GP
                </p>
              </div>
              <div className="p-5">
                <p className="text-[11px] font-medium text-[#9EB5AA]">
                  Total Ditukar
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-[#FCD34D] tabular-nums">
                  -{selectedBalance.redeemed.toLocaleString('id-ID')} GP
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

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D8DFDA] bg-white px-4 py-3">
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
                  className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#54625B]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Cari ID penukaran, nama, atau reward"
                  value={redemptionSearch}
                  onChange={(e) => setRedemptionSearch(e.target.value)}
                  placeholder="Cari nama, ID, atau item..."
                  className="w-full rounded-md border border-[#C6D1CA] bg-[#F8FAF8] py-1.5 pr-3 pl-8 text-xs text-[#17201C] placeholder:text-[#7D8C84] transition-colors focus:border-[#166549] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Mobile Cards (< md) */}
            <div className="space-y-3 md:hidden">
              {filteredRedemptions.length === 0 ? (
                <div className="rounded-lg border border-[#D8DFDA] bg-white p-6 text-center text-xs text-[#54625B]">
                  Tidak ada permintaan penukaran yang cocok.
                </div>
              ) : (
                filteredRedemptions.map((r) => {
                  const ctr = contributorMap.get(r.contributorId);
                  return (
                    <div
                      key={r.id}
                      className="space-y-2.5 rounded-lg border border-[#D8DFDA] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs font-semibold text-[#166549]">
                            {r.id}
                          </p>
                          <p className="text-xs font-medium text-[#17201C]">
                            {r.rewardTitle}
                          </p>
                          <p className="text-[11px] text-[#54625B]">
                            {ctr?.name ?? '-'} · {r.requestedAt}
                          </p>
                        </div>
                        <StatusTag status={r.status} />
                      </div>
                      <div className="flex items-center justify-between border-t border-[#EAEFEA] pt-2">
                        <span className="font-mono text-xs font-semibold text-[#17201C]">
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
            <div className="flex items-start gap-2.5 rounded-lg border border-[#FCD34D] bg-[#FEF3C7] p-3.5 text-xs text-[#B45309]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Insentif finansial bersifat bersyarat dan selektif (terutama
                untuk Keluarga Rentan dan warga aktif) sesuai ketersediaan dana
                program pesantren &amp; mitra.
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
            <div className="space-y-3 rounded-lg border border-[#D8DFDA] bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#166549]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Aturan Perolehan Green Points</span>
              </div>
              <ul className="divide-y divide-[#EAEFEA] border-t border-[#EAEFEA] text-xs text-[#17201C]">
                <li className="py-2.5">
                  Setiap <strong>1 ecobrick terverifikasi fisik</strong>{' '}
                  menghasilkan{' '}
                  <strong className="font-mono text-[#166549]">
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

            <div className="space-y-3 rounded-lg border border-[#D8DFDA] bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1D6373]">
                <Award className="h-4 w-4" aria-hidden="true" />
                <span>Standar Kelayakan Berat per Ukuran Botol</span>
              </div>
              <div className="divide-y divide-[#EAEFEA] border-t border-[#EAEFEA]">
                {BOTTLE_STANDARD_RULES.map((std) => (
                  <div
                    key={std.label}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <span className="font-medium text-[#17201C]">
                      {std.label}
                    </span>
                    <span className="font-mono text-[#1D6373] tabular-nums">
                      Min {std.minUnitKg} kg · Target {std.targetUnitKg} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeader
                title="Katalog Item Green Marketplace Aktif"
                description={
                  canManageRewards
                    ? 'Terbitkan item baru, atur harga Green Points (GP), edit detail, atau hapus barang dari katalog Kontributor.'
                    : 'Item yang tersedia untuk ditukar oleh Kontributor menggunakan saldo Green Points.'
                }
              />
              {canManageRewards && (
                <div className="flex flex-wrap items-center gap-2">
                  {state.rewards.length === 0 && onInitializeMasterCatalog && (
                    <SecondaryButton
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
                      <Database className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {initBusy ? 'Menyiapkan...' : 'Muat Katalog Standar'}
                      </span>
                    </SecondaryButton>
                  )}
                  {onCreateRewardItem && (
                    <PrimaryButton
                      size="sm"
                      onClick={() => setShowAddReward((v) => !v)}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {showAddReward ? 'Tutup Form' : 'Tambah Item Reward'}
                      </span>
                    </PrimaryButton>
                  )}
                </div>
              )}
            </div>

            {state.rewards.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D8DFDA] bg-white px-4 py-3">
                <p className="text-xs text-[#54625B]">
                  Menampilkan{' '}
                  <span className="font-mono font-semibold text-[#17201C] tabular-nums">
                    {filteredCatalogRewards.length}
                  </span>{' '}
                  dari{' '}
                  <span className="font-mono font-semibold text-[#17201C] tabular-nums">
                    {state.rewards.length}
                  </span>{' '}
                  barang terbit di Green Marketplace.
                </p>
                <div className="relative w-full sm:w-64">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#54625B]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Cari barang Green Marketplace"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Cari nama barang atau kategori..."
                    className="w-full rounded-md border border-[#C6D1CA] bg-[#F8FAF8] py-1.5 pr-3 pl-8 text-xs text-[#17201C] placeholder:text-[#7D8C84] transition-colors focus:border-[#166549] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            {showAddReward && canManageRewards && onCreateRewardItem && (
              <form
                onSubmit={handleAddRewardSubmit}
                className="space-y-4 rounded-lg border border-[#D8DFDA] bg-white p-5"
              >
                <SectionHeader
                  title="Tambah Item Green Marketplace"
                  description="Item ini langsung muncul di katalog penukaran Kontributor."
                />
                {rewardFormError && (
                  <div
                    role="alert"
                    className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-medium text-[#B91C1C]"
                  >
                    {rewardFormError}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField id="reward-title" label="Nama Item Reward">
                    <input
                      id="reward-title"
                      type="text"
                      required
                      value={rewardTitle}
                      onChange={(e) => setRewardTitle(e.target.value)}
                      placeholder="Contoh: Paket Bibit Sayur Hidroponik"
                      className={fieldInputClass}
                    />
                  </FormField>
                  <FormField id="reward-category" label="Kategori Reward">
                    <select
                      id="reward-category"
                      value={rewardCategory}
                      onChange={(e) =>
                        setRewardCategory(
                          e.target.value as RewardCatalogItem['category']
                        )
                      }
                      className={fieldInputClass}
                    >
                      {REWARD_CATALOG_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="reward-cost" label="Harga Green Points (GP)">
                    <input
                      id="reward-cost"
                      type="number"
                      min={1}
                      max={100000}
                      step={1}
                      required
                      value={rewardPointsCost}
                      onChange={(e) => setRewardPointsCost(e.target.value)}
                      className={fieldInputClass}
                    />
                  </FormField>
                  <FormField
                    id="reward-stock"
                    label="Keterangan Ketersediaan / Lokasi"
                  >
                    <input
                      id="reward-stock"
                      type="text"
                      required
                      value={rewardStockNote}
                      onChange={(e) => setRewardStockNote(e.target.value)}
                      placeholder="Contoh: Tersedia di Koperasi Eco-Hub"
                      className={fieldInputClass}
                    />
                  </FormField>
                </div>
                <FormField id="reward-desc" label="Deskripsi Manfaat">
                  <textarea
                    id="reward-desc"
                    rows={2}
                    required
                    value={rewardDesc}
                    onChange={(e) => setRewardDesc(e.target.value)}
                    placeholder="Jelaskan manfaat atau isi paket reward untuk kontributor."
                    className={fieldInputClass}
                  />
                </FormField>
                <div className="flex justify-end gap-2">
                  <SecondaryButton
                    size="sm"
                    onClick={() => setShowAddReward(false)}
                  >
                    Batal
                  </SecondaryButton>
                  <PrimaryButton size="sm" type="submit" disabled={rewardSaving}>
                    <span>
                      {rewardSaving ? 'Menyimpan...' : 'Simpan Item Reward'}
                    </span>
                  </PrimaryButton>
                </div>
              </form>
            )}

            {state.rewards.length === 0 ? (
              <div className="rounded-lg border border-[#D8DFDA] bg-white p-6 text-center text-xs text-[#54625B]">
                Belum ada item reward aktif di katalog Firestore `traceco-prod`.
              </div>
            ) : filteredCatalogRewards.length === 0 ? (
              <div className="rounded-lg border border-[#D8DFDA] bg-white p-6 text-center text-xs text-[#54625B]">
                Tidak ada barang Green Marketplace yang cocok dengan kata kunci{' '}
                <strong>"{catalogSearch}"</strong>.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredCatalogRewards.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-[#D8DFDA] bg-white p-4 transition-colors hover:border-[#B5CEC0]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#1D6373]">
                            {item.category}
                          </p>
                          <h3 className="font-display text-sm font-semibold text-[#17201C]">
                            {item.title}
                          </h3>
                        </div>
                        <span className="rounded-md border border-[#B5CEC0] bg-[#EBF4EF] px-2.5 py-1 font-mono text-xs font-semibold text-[#166549] tabular-nums whitespace-nowrap">
                          {item.pointsCost.toLocaleString('id-ID')} GP
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#54625B]">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAEFEA] pt-3">
                      <p className="text-[11px] text-[#54625B]">
                        {item.stockNote}
                      </p>
                      {canManageRewards && (
                        <div className="flex items-center gap-2">
                          {onUpdateRewardItem && (
                            <SecondaryButton
                              size="sm"
                              onClick={() => openEditRewardModal(item)}
                            >
                              <Pencil
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              <span>Atur Harga &amp; Edit</span>
                            </SecondaryButton>
                          )}
                          {onDeleteRewardItem && (
                            <DangerButton
                              size="sm"
                              onClick={() => {
                                setDeleteError(null);
                                setDeletingReward(item);
                              }}
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              <span>Hapus</span>
                            </DangerButton>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
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
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#54625B]"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari mutasi Green Points"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Cari kontributor, batch, atau keterangan..."
                className="w-full rounded-md border border-[#C6D1CA] bg-white py-1.5 pr-3 pl-8 text-xs text-[#17201C] placeholder:text-[#7D8C84] transition-colors focus:border-[#166549] focus:outline-none"
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
                  className="space-y-1.5 rounded-lg border border-[#D8DFDA] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-[#17201C]">
                        {g.sourceLabel}
                      </p>
                      <p className="text-[11px] text-[#54625B]">
                        {ctr?.name ?? '-'} · {g.date}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-xs font-semibold whitespace-nowrap ${
                        g.type === 'Earned'
                          ? 'text-[#166549]'
                          : 'text-[#B91C1C]'
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

      {/* Modal Edit Harga & Detail Barang Marketplace */}
      <Modal
        open={Boolean(editingReward)}
        onClose={() => {
          if (!editSaving) setEditingReward(null);
        }}
        maxWidthClass="max-w-xl"
        titleId="edit-reward-modal-title"
        leadingIcon={
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#B5CEC0] bg-[#EBF4EF] text-[#166549]">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        title={
          <h2
            id="edit-reward-modal-title"
            className="font-display text-base font-semibold text-[#17201C]"
          >
            Atur Harga &amp; Detail Barang
          </h2>
        }
        subtitle="Perubahan langsung memperbarui katalog Green Marketplace untuk seluruh Kontributor."
      >
        <form onSubmit={handleEditRewardSubmit} className="space-y-4">
          {editError && (
            <div
              role="alert"
              className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-medium text-[#B91C1C]"
            >
              {editError}
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-[#D8DFDA] bg-[#F8FAF8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="edit-reward-cost"
                className="text-xs font-semibold text-[#17201C]"
              >
                Harga Penukaran (Green Points)
              </label>
              <span className="font-mono text-xs text-[#54625B] tabular-nums">
                Sebelumnya: {editingReward?.pointsCost.toLocaleString('id-ID')}{' '}
                GP
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="edit-reward-cost"
                type="number"
                min={1}
                max={100000}
                step={1}
                required
                value={editPointsCost}
                onChange={(e) => setEditPointsCost(e.target.value)}
                className={`${fieldInputClass} max-w-[160px] font-mono font-semibold tabular-nums`}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {[-50, -10, 10, 50].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => adjustEditPrice(delta)}
                    className="rounded-md border border-[#C6D1CA] bg-white px-2.5 py-1.5 font-mono text-[11px] font-semibold text-[#17201C] tabular-nums transition-colors hover:border-[#166549] hover:bg-[#EBF4EF] hover:text-[#166549]"
                  >
                    {delta > 0 ? `+${delta}` : delta} GP
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="edit-reward-title" label="Nama Barang Reward">
              <input
                id="edit-reward-title"
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={fieldInputClass}
              />
            </FormField>
            <FormField id="edit-reward-category" label="Kategori">
              <select
                id="edit-reward-category"
                value={editCategory}
                onChange={(e) =>
                  setEditCategory(
                    e.target.value as RewardCatalogItem['category']
                  )
                }
                className={fieldInputClass}
              >
                {REWARD_CATALOG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField
            id="edit-reward-stock"
            label="Keterangan Ketersediaan / Lokasi Ambil"
          >
            <input
              id="edit-reward-stock"
              type="text"
              required
              value={editStockNote}
              onChange={(e) => setEditStockNote(e.target.value)}
              className={fieldInputClass}
            />
          </FormField>

          <FormField id="edit-reward-desc" label="Deskripsi Manfaat">
            <textarea
              id="edit-reward-desc"
              rows={3}
              required
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className={fieldInputClass}
            />
          </FormField>

          <div className="flex justify-end gap-2 border-t border-[#EAEFEA] pt-4">
            <SecondaryButton
              size="sm"
              disabled={editSaving}
              onClick={() => setEditingReward(null)}
            >
              Batal
            </SecondaryButton>
            <PrimaryButton size="sm" type="submit" disabled={editSaving}>
              <span>{editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus Barang Marketplace */}
      <Modal
        open={Boolean(deletingReward)}
        onClose={() => {
          if (!deleteBusy) setDeletingReward(null);
        }}
        maxWidthClass="max-w-md"
        titleId="delete-reward-modal-title"
        leadingIcon={
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E5B8B8] bg-[#FEF2F2] text-[#B91C1C]">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        title={
          <h2
            id="delete-reward-modal-title"
            className="font-display text-base font-semibold text-[#17201C]"
          >
            Hapus Barang dari Green Marketplace?
          </h2>
        }
        subtitle="Tindakan ini menghapus item dari katalog penukaran aktif."
      >
        <div className="space-y-4">
          {deleteError && (
            <div
              role="alert"
              className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-medium text-[#B91C1C]"
            >
              {deleteError}
            </div>
          )}

          {deletingReward && (
            <div className="space-y-1.5 rounded-lg border border-[#D8DFDA] bg-[#F8FAF8] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-sm font-semibold text-[#17201C]">
                  {deletingReward.title}
                </p>
                <span className="font-mono text-xs font-semibold text-[#166549] tabular-nums whitespace-nowrap">
                  {deletingReward.pointsCost.toLocaleString('id-ID')} GP
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#1D6373]">
                {deletingReward.category}
              </p>
              <p className="text-xs text-[#54625B]">
                {deletingReward.stockNote}
              </p>
            </div>
          )}

          <p className="text-xs leading-relaxed text-[#54625B]">
            Kontributor tidak akan lagi melihat barang ini untuk ditukar.
            Riwayat penukaran (<em>redemption</em>) yang sudah tercatat
            sebelumnya tetap aman tersimpan di buku besar.
          </p>

          <div className="flex justify-end gap-2 border-t border-[#EAEFEA] pt-4">
            <SecondaryButton
              size="sm"
              disabled={deleteBusy}
              onClick={() => setDeletingReward(null)}
            >
              Batal
            </SecondaryButton>
            <button
              type="button"
              disabled={deleteBusy}
              onClick={handleConfirmDeleteReward}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#B91C1C] px-3 py-1.5 text-xs font-medium text-white shadow-2xs transition-colors hover:bg-[#991B1B] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{deleteBusy ? 'Menghapus...' : 'Hapus Permanen'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
