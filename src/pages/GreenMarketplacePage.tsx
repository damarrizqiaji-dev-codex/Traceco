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

function getCategoryVisual(category: RewardCatalogItem['category']) {
  switch (category) {
    case 'Merchandise Ramah Lingkungan':
      return {
        Icon: ShoppingBag,
        boxClass: 'bg-[#EFF5F2] text-[#1B5E43] border border-[#C5D9CD]',
        labelClass: 'text-[#1B5E43]',
      };
    case 'Voucher Kegiatan':
      return {
        Icon: Ticket,
        boxClass: 'bg-[#F1F6F7] text-[#2B5E6B] border border-[#C4D8DD]',
        labelClass: 'text-[#2B5E6B]',
      };
    case 'Perlengkapan Belajar':
      return {
        Icon: BookOpen,
        boxClass: 'bg-[#F8FAF9] text-[#34403A] border border-[#D9E0DC]',
        labelClass: 'text-[#58655E]',
      };
    case 'Benefit Komunitas':
      return {
        Icon: Gift,
        boxClass: 'bg-[#EFF5F2] text-[#1B5E43] border border-[#C5D9CD]',
        labelClass: 'text-[#1B5E43]',
      };
    default:
      return {
        Icon: Award,
        boxClass: 'bg-[#EFF5F2] text-[#1B5E43] border border-[#C5D9CD]',
        labelClass: 'text-[#1B5E43]',
      };
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

  const affordableTotal = state.rewards.filter(
    (r) => balanceSummary.balance >= r.pointsCost
  ).length;

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
          <SecondaryButton
            size="sm"
            onClick={() => onNavigate('transactions', 'ledger')}
          >
            Riwayat Transaksi
          </SecondaryButton>
        }
      />

      {/* Active GP Wallet Card */}
      <section className="rounded-lg border border-[#D9E0DC] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-mono text-xs font-semibold text-[#1B5E43]">
              Dompet Green Points Aktif
            </p>
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="font-display text-3xl font-semibold text-[#141B17] tabular-nums">
                {balanceSummary.balance.toLocaleString('id-ID')} GP
              </p>
              <span className="text-xs text-[#58655E]">
                {affordableTotal} dari {state.rewards.length} item siap ditukar saat ini
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setOnlyAffordable((v) => !v);
                if (currentTab !== 'catalog') onChangeSubTab('catalog');
              }}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                onlyAffordable
                  ? 'border-[#1B5E43] bg-[#EFF5F2] text-[#1B5E43]'
                  : 'border-[#B5CEC0] bg-white text-[#1B5E43] hover:bg-[#EFF5F2] hover:border-[#1B5E43]'
              }`}
            >
              <span>
                {onlyAffordable
                  ? 'Menampilkan Item Terjangkau'
                  : `Saring Item Terjangkau (${affordableTotal})`}
              </span>
            </button>
          </div>
        </div>
      </section>

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
                <label className="inline-flex items-center gap-2 rounded-md border border-[#D9E0DC] bg-white px-3 py-1.5 text-xs text-[#1B231F] cursor-pointer hover:border-[#1B5E43] transition-colors duration-150">
                  <input
                    type="checkbox"
                    checked={onlyAffordable}
                    onChange={(e) => setOnlyAffordable(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#1B5E43]"
                  />
                  <span>Saldo mencukupi saja</span>
                </label>

                <div className="relative w-full sm:w-56">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#58655E]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Cari reward di marketplace"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari reward..."
                    className="w-full rounded-md border border-[#C5CEC9] bg-white py-1.5 pr-3 pl-8 text-xs text-[#1B231F] placeholder:text-[#78857E] focus:border-[#1B5E43] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {filteredRewards.length === 0 ? (
              <div className="rounded-lg border border-[#D9E0DC] bg-white p-8 text-center space-y-2">
                <p className="text-xs font-medium text-[#1B231F]">
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
                  const { Icon, boxClass, labelClass } = getCategoryVisual(
                    item.category
                  );
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
                      className="group flex flex-col justify-between gap-4 rounded-lg border border-[#D9E0DC] bg-white p-5 transition-colors duration-150 hover:border-[#1B5E43]"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${boxClass}`}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p
                                className={`text-[11px] font-semibold ${labelClass}`}
                              >
                                {item.category}
                              </p>
                              <h3 className="font-display text-[15px] font-semibold text-[#141B17]">
                                {item.title}
                              </h3>
                            </div>
                            <span className="shrink-0 font-mono text-sm font-semibold text-[#1B5E43] tabular-nums">
                              {item.pointsCost} GP
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-[#58655E]">
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
                                ? 'font-semibold text-[#1B5E43]'
                                : 'text-[#58655E]'
                            }
                          >
                            {enough
                              ? 'Saldo Anda mencukupi untuk ditukar'
                              : `Kurang ${missingGp} GP (≈ ${unitsNeeded} ecobrick terverifikasi)`}
                          </span>
                          <span className="font-mono text-[#58655E] tabular-nums">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ECF0ED]">
                          <div
                            className={`h-full rounded-full transition-[width] duration-300 ${
                              enough ? 'bg-[#1B5E43]' : 'bg-[#A4B8AD]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EAEFEA] pt-3">
                        <span className="text-[11px] text-[#58655E]">
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
              <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white">
                {myRedemptions.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-[#141B17]">
                        {r.rewardTitle}
                      </p>
                      <p className="font-mono text-[11px] text-[#58655E]">
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
          <section className="rounded-lg border border-[#D9E0DC] bg-white p-5 sm:p-6 space-y-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAEFEA] pb-4">
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
                className="rounded-md border border-[#C5CEC9] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1B231F] focus:border-[#1B5E43] focus:outline-none"
              >
                {state.rewards.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.pointsCost} GP)
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const { Icon, boxClass, labelClass } = getCategoryVisual(
                selectedReward.category
              );
              return (
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${boxClass}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <p className={`text-xs font-semibold ${labelClass}`}>
                      {selectedReward.category}
                    </p>
                    <h2 className="font-display text-lg font-semibold text-[#141B17]">
                      {selectedReward.title}
                    </h2>
                    <p className="text-xs leading-relaxed text-[#58655E]">
                      {selectedReward.description}
                    </p>
                    <p className="pt-1 text-xs font-medium text-[#1B231F]">
                      Ketersediaan:{' '}
                      <span className="text-[#1B5E43]">
                        {selectedReward.stockNote}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Confirmation Card */}
          <section className="rounded-lg border border-[#D9E0DC] bg-white p-5 sm:p-6 space-y-5 lg:col-span-5">
            <SectionHeader
              title="Konfirmasi Penukaran"
              description="Periksa rincian Green Points Anda sebelum menekan Konfirmasi Penukaran."
            />

            {redeemError && (
              <div
                role="alert"
                className="rounded-md border border-[#E8C5C5] bg-[#FDF3F3] px-3.5 py-2.5 text-xs font-medium text-[#A62626]"
              >
                {redeemError}
              </div>
            )}

            {redeemSuccess ? (
              <div className="space-y-4">
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-md border border-[#C5D9CD] bg-[#EFF5F2] p-4 text-xs text-[#1B5E43]"
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
                    Lihat Transaksi &amp; Saldo
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
                <dl className="divide-y divide-[#EAEFEA] border-y border-[#D9E0DC] text-xs">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[#58655E]">Reward</dt>
                    <dd className="text-right font-semibold text-[#141B17]">
                      {selectedReward.title}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[#58655E]">Biaya Poin</dt>
                    <dd className="font-mono font-semibold text-[#34403A] tabular-nums">
                      {selectedReward.pointsCost.toLocaleString('id-ID')} GP
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[#58655E]">Saldo Saat Ini</dt>
                    <dd className="font-mono font-semibold text-[#141B17] tabular-nums">
                      {balanceSummary.balance.toLocaleString('id-ID')} GP
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="font-medium text-[#1B231F]">
                      Saldo Setelah Penukaran
                    </dt>
                    <dd
                      className={`font-mono font-semibold tabular-nums ${
                        hasEnoughBalance ? 'text-[#1B5E43]' : 'text-[#A62626]'
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
