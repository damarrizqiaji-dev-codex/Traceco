import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Gift,
  Search,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import type { AppPageId, RewardCatalogItem, TracecoState } from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
  computeContributorPointsBalance,
} from '../utils/tracecoLogic';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
import { FilterBar } from '../components/ui/FilterBar';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { StatusTag } from '../components/ui/StatusBadge';
import { SubNavTabs } from '../components/ui/SubNavTabs';

interface GreenMarketplacePageProps {
  state: TracecoState;
  activeSubTab: string;
  onChangeSubTab: (sub: string) => void;
  selectedRewardId: string | null;
  onSelectRewardId: (rewardId: string) => void;
  onRedeemReward: (params: {
    contributorId: string;
    rewardId: string;
  }) => Promise<{ error?: string }> | { error?: string };
  onNavigate: (page: AppPageId, sub?: string) => void;
}

function getCategoryIcon(category: RewardCatalogItem['category']) {
  switch (category) {
    case 'Merchandise Ramah Lingkungan':
      return ShoppingBag;
    case 'Voucher Kegiatan':
      return Ticket;
    case 'Perlengkapan Belajar':
      return BookOpen;
    case 'Benefit Komunitas':
      return Gift;
    default:
      return Award;
  }
}

export function GreenMarketplacePage({
  state,
  activeSubTab,
  onChangeSubTab,
  selectedRewardId,
  onSelectRewardId,
  onRedeemReward,
  onNavigate,
}: GreenMarketplacePageProps) {
  const actorId = state.currentUserId ?? '';
  const balanceSummary = computeContributorPointsBalance(state, actorId);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [onlyAffordable, setOnlyAffordable] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<{
    rewardTitle: string;
    pointsCost: number;
    newBalance: number;
  } | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const currentTab = activeSubTab === 'detail' ? 'detail' : 'catalog';
  const selectedReward =
    state.rewards.find((r) => r.id === selectedRewardId) ?? state.rewards[0];

  const myRedemptions = state.redemptions.filter(
    (r) => r.contributorId === actorId
  );

  const categories = Array.from(new Set(state.rewards.map((r) => r.category)));
  const filteredRewards = state.rewards.filter((item) => {
    const matchCategory =
      categoryFilter === 'Semua' || item.category === categoryFilter;
    const matchAffordable =
      !onlyAffordable || balanceSummary.balance >= item.pointsCost;
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchCategory && matchAffordable && matchQuery;
  });

  const handleOpenRewardDetail = (reward: RewardCatalogItem) => {
    onSelectRewardId(reward.id);
    setRedeemError(null);
    setRedeemSuccess(null);
    onChangeSubTab('detail');
  };

  const handleConfirmRedemption = async () => {
    if (!selectedReward || isConfirming) return;
    setIsConfirming(true);
    setRedeemError(null);

    try {
      const res = await onRedeemReward({
        contributorId: actorId,
        rewardId: selectedReward.id,
      });

      if (res.error) {
        setRedeemError(res.error);
        return;
      }

      const nextBalance = Math.max(
        0,
        balanceSummary.balance - selectedReward.pointsCost
      );
      setRedeemSuccess({
        rewardTitle: selectedReward.title,
        pointsCost: selectedReward.pointsCost,
        newBalance: nextBalance,
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const balanceAfterPreview = selectedReward
    ? balanceSummary.balance - selectedReward.pointsCost
    : balanceSummary.balance;
  const hasEnoughBalance = selectedReward
    ? balanceSummary.balance >= selectedReward.pointsCost
    : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Green Marketplace"
        description={`Tukarkan Green Points Anda (+${POINTS_PER_ECOBRICK} GP per ecobrick terverifikasi) dengan produk dan manfaat komunitas.`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] text-[#6B756F]">Saldo Anda</p>
              <p className="font-mono text-sm font-semibold text-[#245C45] tabular-nums">
                {balanceSummary.balance.toLocaleString('id-ID')} GP
              </p>
            </div>
            <SecondaryButton
              size="sm"
              onClick={() => onNavigate('transactions', 'ledger')}
            >
              Riwayat Transaksi
            </SecondaryButton>
          </div>
        }
      />

      <SubNavTabs
        ariaLabel="Submenu Green Marketplace"
        activeId={currentTab}
        onChange={(id) => {
          setRedeemError(null);
          onChangeSubTab(id);
        }}
        items={[
          { id: 'catalog', label: 'Marketplace', badge: state.rewards.length },
          { id: 'detail', label: 'Detail Reward' },
        ]}
      />

      {currentTab === 'catalog' && (
        <div className="space-y-7">
          <section className="space-y-4">
            <SectionHeader
              title="Katalog Reward Komunitas"
              description="Cari atau saring item berdasarkan kategori dan kesiapan saldo Green Points Anda."
            />

            {/* Interactive Search + Category Filter + Affordability Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterBar
                ariaLabel="Filter kategori reward"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: 'Semua', label: 'Semua', count: state.rewards.length },
                  ...categories.map((cat) => ({
                    value: cat,
                    label: cat.split(' ')[0],
                    count: state.rewards.filter((r) => r.category === cat).length,
                  })),
                ]}
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <label className="inline-flex items-center gap-2 rounded border border-[#E3E8E4] bg-white px-3 py-1.5 text-xs text-[#252B28] cursor-pointer hover:border-[#C6DBC9] transition-colors duration-150">
                  <input
                    type="checkbox"
                    checked={onlyAffordable}
                    onChange={(e) => setOnlyAffordable(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#245C45]"
                  />
                  <span>Saldo mencukupi saja</span>
                </label>

                <div className="relative w-full sm:w-56">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#6B756F]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Cari reward di marketplace"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari reward..."
                    className="w-full rounded border border-[#CFD8D2] bg-white py-1.5 pr-3 pl-8 text-xs text-[#252B28] placeholder:text-[#8A948E] focus:border-[#245C45] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {filteredRewards.length === 0 ? (
              <div className="rounded-md border border-[#E3E8E4] bg-white p-8 text-center space-y-2">
                <p className="text-xs font-medium text-[#252B28]">
                  Tidak ada item reward yang cocok dengan filter saat ini.
                </p>
                <SecondaryButton
                  size="sm"
                  onClick={() => {
                    setCategoryFilter('Semua');
                    setOnlyAffordable(false);
                    setSearchQuery('');
                  }}
                >
                  Tampilkan Semua Reward
                </SecondaryButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredRewards.map((item) => {
                  const Icon = getCategoryIcon(item.category);
                  const enough = balanceSummary.balance >= item.pointsCost;
                  const pct = Math.min(
                    100,
                    Math.round((balanceSummary.balance / item.pointsCost) * 100)
                  );
                  const missingGp = Math.max(
                    0,
                    item.pointsCost - balanceSummary.balance
                  );
                  const unitsNeeded = Math.ceil(missingGp / POINTS_PER_ECOBRICK);

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-4 rounded-md border border-[#E3E8E4] bg-white p-5 transition-[border-color,box-shadow] duration-150 hover:border-[#95BCA4]"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#E7F0E8]/70 text-[#245C45]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-medium text-[#4F8A68]">
                                {item.category}
                              </p>
                              <h3 className="font-display text-[15px] font-semibold text-[#252B28]">
                                {item.title}
                              </h3>
                            </div>
                            <span className="shrink-0 font-mono text-sm font-semibold text-[#245C45] tabular-nums">
                              {item.pointsCost} GP
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-[#6B756F]">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Affordability readiness bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={
                              enough
                                ? 'font-medium text-[#245C45]'
                                : 'text-[#6B756F]'
                            }
                          >
                            {enough
                              ? 'Saldo Anda mencukupi untuk ditukar'
                              : `Kurang ${missingGp} GP (≈ ${unitsNeeded} ecobrick terverifikasi)`}
                          </span>
                          <span className="font-mono text-[#6B756F] tabular-nums">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEF2EF]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              enough ? 'bg-[#245C45]' : 'bg-[#95BCA4]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF2EF] pt-3">
                        <span className="text-[11px] text-[#6B756F]">
                          {item.stockNote}
                        </span>
                        <PrimaryButton
                          size="sm"
                          onClick={() => handleOpenRewardDetail(item)}
                        >
                          <span>
                            {enough ? 'Pilih & Tukar' : 'Lihat Detail'}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </PrimaryButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {myRedemptions.length > 0 && (
            <section className="space-y-3">
              <SectionHeader
                title="Status Penukaran Terbaru Anda"
                description="Penukaran yang telah dikonfirmasi diproses oleh Admin Eco-Hub."
              />
              <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white">
                {myRedemptions.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-[#252B28]">
                        {r.rewardTitle}
                      </p>
                      <p className="font-mono text-[11px] text-[#6B756F]">
                        {r.id} · {r.requestedAt} · -{r.pointsCost} GP
                      </p>
                    </div>
                    <StatusTag status={r.status} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {currentTab === 'detail' && selectedReward && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Selected Reward Detail */}
          <section className="rounded-md border border-[#E3E8E4] bg-white p-5 sm:p-6 space-y-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2EF] pb-4">
              <SecondaryButton
                size="sm"
                onClick={() => {
                  setRedeemSuccess(null);
                  setRedeemError(null);
                  onChangeSubTab('catalog');
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kembali ke Marketplace</span>
              </SecondaryButton>

              <select
                aria-label="Pilih item reward"
                value={selectedReward.id}
                onChange={(e) => {
                  onSelectRewardId(e.target.value);
                  setRedeemSuccess(null);
                  setRedeemError(null);
                }}
                className="rounded border border-[#CFD8D2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#252B28] focus:border-[#245C45] focus:outline-none"
              >
                {state.rewards.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.pointsCost} GP)
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const Icon = getCategoryIcon(selectedReward.category);
              return (
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#E7F0E8] text-[#245C45]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[#4F8A68]">
                      {selectedReward.category}
                    </p>
                    <h2 className="font-display text-lg font-semibold text-[#252B28]">
                      {selectedReward.title}
                    </h2>
                    <p className="text-xs leading-relaxed text-[#6B756F]">
                      {selectedReward.description}
                    </p>
                    <p className="pt-1 text-xs font-medium text-[#252B28]">
                      Ketersediaan:{' '}
                      <span className="text-[#245C45]">
                        {selectedReward.stockNote}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Confirmation Card */}
          <section className="rounded-md border border-[#E3E8E4] bg-white p-5 sm:p-6 space-y-5 lg:col-span-5">
            <SectionHeader
              title="Konfirmasi Penukaran"
              description="Periksa rincian Green Points Anda sebelum menekan Konfirmasi Penukaran."
            />

            {redeemError && (
              <div
                role="alert"
                className="rounded border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]"
              >
                {redeemError}
              </div>
            )}

            {redeemSuccess ? (
              <div className="space-y-4">
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded border border-[#C6DBC9] bg-[#E7F0E8] p-4 text-xs text-[#245C45]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold">Penukaran Berhasil Dicatat</p>
                    <p>
                      Reward <strong>{redeemSuccess.rewardTitle}</strong> (
                      -{redeemSuccess.pointsCost} GP) telah dibuat dan menunggu
                      serah terima di pos pesantren.
                    </p>
                    <p className="font-mono font-semibold">
                      Saldo tersisa: {redeemSuccess.newBalance.toLocaleString('id-ID')} GP
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PrimaryButton
                    size="sm"
                    onClick={() => onNavigate('transactions', 'ledger')}
                  >
                    Lihat Transaksi & Saldo
                  </PrimaryButton>
                  <SecondaryButton
                    size="sm"
                    onClick={() => {
                      setRedeemSuccess(null);
                      onChangeSubTab('catalog');
                    }}
                  >
                    Kembali ke Marketplace
                  </SecondaryButton>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <dl className="divide-y divide-[#EEF2EF] border-y border-[#E3E8E4] text-xs">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[#6B756F]">Reward</dt>
                    <dd className="text-right font-semibold text-[#252B28]">
                      {selectedReward.title}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[#6B756F]">Biaya Poin</dt>
                    <dd className="font-mono font-semibold text-[#92400E] tabular-nums">
                      {selectedReward.pointsCost.toLocaleString('id-ID')} GP
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[#6B756F]">Saldo Saat Ini</dt>
                    <dd className="font-mono font-semibold text-[#252B28] tabular-nums">
                      {balanceSummary.balance.toLocaleString('id-ID')} GP
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="font-medium text-[#252B28]">
                      Saldo Setelah Penukaran
                    </dt>
                    <dd
                      className={`font-mono font-semibold tabular-nums ${
                        hasEnoughBalance ? 'text-[#245C45]' : 'text-[#991B1B]'
                      }`}
                    >
                      {hasEnoughBalance
                        ? `${balanceAfterPreview.toLocaleString('id-ID')} GP`
                        : `Kurang ${Math.abs(balanceAfterPreview)} GP`}
                    </dd>
                  </div>
                </dl>

                {hasEnoughBalance ? (
                  <PrimaryButton
                    disabled={isConfirming}
                    onClick={handleConfirmRedemption}
                    className="w-full"
                  >
                    <Award className="h-4 w-4" aria-hidden="true" />
                    <span>Konfirmasi Penukaran</span>
                  </PrimaryButton>
                ) : (
                  <div className="space-y-2">
                    <PrimaryButton disabled className="w-full">
                      <Award className="h-4 w-4" aria-hidden="true" />
                      <span>Saldo Green Points Belum Cukup</span>
                    </PrimaryButton>
                    <SecondaryButton
                      size="sm"
                      onClick={() => onNavigate('contribution', 'submit')}
                      className="w-full"
                    >
                      <span>Kirim Ecobrick untuk Tambah Poin</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </SecondaryButton>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
