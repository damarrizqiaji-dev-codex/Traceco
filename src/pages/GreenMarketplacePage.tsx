import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Gift,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import type { AppPageId, RewardCatalogItem, TracecoState } from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
  computeContributorPointsBalance,
} from '../utils/tracecoLogic';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
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
  }) => { error?: string };
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
  const actorId = state.activeActorIdByRole[state.activeRole];
  const balanceSummary = computeContributorPointsBalance(state, actorId);

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

  const handleOpenRewardDetail = (reward: RewardCatalogItem) => {
    onSelectRewardId(reward.id);
    setRedeemError(null);
    setRedeemSuccess(null);
    onChangeSubTab('detail');
  };

  const handleConfirmRedemption = () => {
    if (!selectedReward || isConfirming) return;
    setIsConfirming(true);
    setRedeemError(null);

    const res = onRedeemReward({
      contributorId: actorId,
      rewardId: selectedReward.id,
    });

    if (res.error) {
      setRedeemError(res.error);
      setIsConfirming(false);
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
    setIsConfirming(false);
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded border border-[#C6DBC9] bg-[#E7F0E8] px-3 py-1.5 text-xs font-medium text-[#245C45]">
              Saldo Anda:{' '}
              <span className="font-mono font-semibold tabular-nums">
                {balanceSummary.balance.toLocaleString('id-ID')} GP
              </span>
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
          <section className="space-y-3">
            <SectionHeader
              title="Katalog Reward Komunitas"
              description="Pilih reward untuk melihat detail dan mengonfirmasi penukaran Green Points."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {state.rewards.map((item) => {
                const Icon = getCategoryIcon(item.category);
                const enough = balanceSummary.balance >= item.pointsCost;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-4 rounded-md border border-[#E3E8E4] bg-white p-5 transition-colors hover:border-[#C6DBC9]"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#DCE4DE] bg-[#F7F9F7] text-[#245C45]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-medium text-[#4F8A68]">
                              {item.category}
                            </p>
                            <h3 className="text-sm font-semibold text-[#252B28]">
                              {item.title}
                            </h3>
                          </div>
                          <span className="shrink-0 rounded border border-[#C6DBC9] bg-[#E7F0E8] px-2 py-0.5 font-mono text-xs font-semibold text-[#245C45] tabular-nums">
                            {item.pointsCost} GP
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#6B756F]">
                          {item.description}
                        </p>
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
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#C6DBC9] bg-[#E7F0E8] text-[#245C45]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[#4F8A68]">
                      {selectedReward.category}
                    </p>
                    <h2 className="text-lg font-semibold text-[#252B28]">
                      {selectedReward.title}
                    </h2>
                    <p className="text-xs leading-relaxed text-[#6B756F]">
                      {selectedReward.description}
                    </p>
                    <p className="text-xs font-medium text-[#252B28] pt-1">
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
                <dl className="divide-y divide-[#EEF2EF] rounded border border-[#E3E8E4] bg-[#F7F9F7] text-xs">
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <dt className="text-[#6B756F]">Reward</dt>
                    <dd className="text-right font-semibold text-[#252B28]">
                      {selectedReward.title}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <dt className="text-[#6B756F]">Required Points</dt>
                    <dd className="font-mono font-semibold text-[#92400E] tabular-nums">
                      {selectedReward.pointsCost.toLocaleString('id-ID')} Green Points
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <dt className="text-[#6B756F]">Current Balance</dt>
                    <dd className="font-mono font-semibold text-[#252B28] tabular-nums">
                      {balanceSummary.balance.toLocaleString('id-ID')} Green Points
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white">
                    <dt className="font-medium text-[#252B28]">
                      Balance After Redemption
                    </dt>
                    <dd
                      className={`font-mono font-semibold tabular-nums ${
                        hasEnoughBalance ? 'text-[#245C45]' : 'text-[#991B1B]'
                      }`}
                    >
                      {hasEnoughBalance
                        ? `${balanceAfterPreview.toLocaleString('id-ID')} Green Points`
                        : `Kurang ${Math.abs(balanceAfterPreview)} GP`}
                    </dd>
                  </div>
                </dl>

                <PrimaryButton
                  disabled={!hasEnoughBalance || isConfirming}
                  onClick={handleConfirmRedemption}
                  className="w-full"
                >
                  <Award className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {hasEnoughBalance
                      ? 'Konfirmasi Penukaran'
                      : 'Saldo Green Points Belum Cukup'}
                  </span>
                </PrimaryButton>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
