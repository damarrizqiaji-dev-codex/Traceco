import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Info,
  Search,
} from 'lucide-react';
import type { AppPageId, TracecoState } from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
  computeContributorPointsBalance,
  computeContributorTransactionsWithBalance,
} from '../utils/tracecoLogic';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
import { FilterBar } from '../components/ui/FilterBar';
import { MetricStrip } from '../components/ui/Metric';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { StatusTag } from '../components/ui/StatusBadge';
import { SubNavTabs } from '../components/ui/SubNavTabs';

interface TransactionsBalancePageProps {
  state: TracecoState;
  activeSubTab: string;
  onChangeSubTab: (sub: string) => void;
  onNavigate: (page: AppPageId, sub?: string) => void;
  onOpenTraceDetail: (targetId: string) => void;
}

export function TransactionsBalancePage({
  state,
  activeSubTab,
  onChangeSubTab,
  onNavigate,
  onOpenTraceDetail,
}: TransactionsBalancePageProps) {
  const actorId = state.currentUserId ?? '';
  const balanceSummary = computeContributorPointsBalance(state, actorId);
  const transactions = computeContributorTransactionsWithBalance(state, actorId);
  const myIncentives = state.financial_incentives.filter(
    (f) => f.contributorId === actorId
  );

  const [typeFilter, setTypeFilter] = useState<'Semua' | 'Earned' | 'Redeemed'>(
    'Semua'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const currentTab = activeSubTab === 'ledger' ? 'ledger' : 'balance';

  const filteredTransactions = transactions.filter((t) => {
    const matchType = typeFilter === 'Semua' ? true : t.type === typeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      t.sourceLabel.toLowerCase().includes(q) ||
      (t.submissionId ?? '').toLowerCase().includes(q) ||
      (t.batchId ?? '').toLowerCase().includes(q) ||
      t.date.toLowerCase().includes(q);
    return matchType && matchQuery;
  });

  const earnedCount = transactions.filter((t) => t.type === 'Earned').length;
  const redeemedCount = transactions.filter(
    (t) => t.type === 'Redeemed'
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaksi & Saldo"
        description="Lihat saldo Green Points Anda saat ini beserta riwayat perolehan dan penukaran poin."
        actions={
          <PrimaryButton
            size="sm"
            onClick={() => onNavigate('marketplace', 'catalog')}
          >
            <span>Buka Green Marketplace</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </PrimaryButton>
        }
      />

      <SubNavTabs
        ariaLabel="Submenu Transaksi dan Saldo"
        activeId={currentTab}
        onChange={onChangeSubTab}
        items={[
          { id: 'balance', label: 'Saldo' },
          {
            id: 'ledger',
            label: 'Riwayat Transaksi',
            badge: transactions.length,
          },
        ]}
      />

      {currentTab === 'balance' && (
        <div className="space-y-6">
          {/* Active Balance Summary Card */}
          <section className="rounded-lg border border-[#D9E0DC] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1.5">
                <p className="font-mono text-xs font-semibold text-[#1B5E43]">
                  Saldo Green Points Aktif
                </p>
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="font-display text-3xl font-semibold tracking-tight text-[#141B17] tabular-nums">
                    {balanceSummary.balance.toLocaleString('id-ID')} GP
                  </p>
                  <span className="font-mono text-xs text-[#58655E]">
                    +{POINTS_PER_ECOBRICK} GP / ecobrick terverifikasi
                  </span>
                </div>
                <p className="text-xs text-[#58655E]">
                  Sistem poin insentif internal non-kripto · {earnedCount} kali
                  perolehan · {redeemedCount} kali penukaran.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <SecondaryButton
                  size="sm"
                  onClick={() => onChangeSubTab('ledger')}
                >
                  Riwayat Transaksi
                </SecondaryButton>
                <PrimaryButton
                  size="sm"
                  onClick={() => onNavigate('marketplace', 'catalog')}
                >
                  <span>Tukarkan Poin</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </PrimaryButton>
              </div>
            </div>
          </section>

          <MetricStrip
            columns={3}
            items={[
              {
                label: 'Total Poin Diperoleh',
                value: `+${balanceSummary.earned.toLocaleString('id-ID')} GP`,
                hint: `${earnedCount} transaksi masuk dari verifikasi`,
                accent: 'primary',
              },
              {
                label: 'Total Poin Ditukar',
                value: `-${balanceSummary.redeemed.toLocaleString('id-ID')} GP`,
                hint: `${redeemedCount} penukaran di Green Marketplace`,
                accent: balanceSummary.redeemed > 0 ? 'amber' : 'muted',
              },
              {
                label: 'Jumlah Mutasi Buku',
                value: `${transactions.length} mutasi`,
                hint: 'Klik untuk lihat buku mutasi lengkap',
                accent: 'teal',
                onClick: () => onChangeSubTab('ledger'),
              },
            ]}
          />

          <section className="space-y-3">
            <SectionHeader
              title="Transaksi Terbaru"
              rightSlot={
                <SecondaryButton
                  size="sm"
                  onClick={() => onChangeSubTab('ledger')}
                >
                  Lihat Semua
                </SecondaryButton>
              }
            />
            <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white">
              {transactions.length === 0 ? (
                <p className="p-6 text-center text-xs text-[#58655E]">
                  Belum ada mutasi Green Points pada akun ini.
                </p>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-[#F8FAF9]"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                          tx.type === 'Earned'
                            ? 'border-[#C5D9CD] bg-[#EFF5F2] text-[#1B5E43]'
                            : 'border-[#E8C5C5] bg-[#FDF3F3] text-[#A62626]'
                        }`}
                      >
                        {tx.type === 'Earned' ? (
                          <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-[#1B231F]">
                          {tx.sourceLabel}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#58655E]">
                          <span>{tx.date}</span>
                          {tx.submissionId && (
                            <>
                              <span aria-hidden="true">·</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenTraceDetail(tx.submissionId!)
                                }
                                className="font-medium text-[#2B5E6B] hover:underline"
                              >
                                {tx.submissionId}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          tx.type === 'Earned'
                            ? 'text-[#1B5E43]'
                            : 'text-[#A62626]'
                        }`}
                      >
                        {tx.signedPoints > 0
                          ? `+${tx.signedPoints}`
                          : tx.signedPoints}{' '}
                        GP
                      </p>
                      <p className="font-mono text-[11px] text-[#58655E] tabular-nums">
                        Saldo: {tx.balanceAfter.toLocaleString('id-ID')} GP
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {myIncentives.length > 0 && (
            <section className="space-y-3">
              <SectionHeader title="Dukungan Program Insentif Bersyarat" />
              <div className="flex items-start gap-2.5 rounded-lg border border-[#C4D8DD] bg-[#F1F6F7] p-3.5 text-xs text-[#2B5E6B]">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Dukungan insentif khusus program komunitas &amp; keluarga
                  rentan sesuai ketersediaan dana pesantren.
                </span>
              </div>
              <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white">
                {myIncentives.map((fin) => (
                  <div
                    key={fin.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-[#1B231F]">
                        {fin.fundingSource} · Batch {fin.batchId}
                      </p>
                      <p className="text-[11px] text-[#58655E]">
                        {fin.conditionNote}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold text-[#141B17] tabular-nums">
                        Rp {fin.amountIdr.toLocaleString('id-ID')}
                      </span>
                      <StatusTag status={fin.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {currentTab === 'ledger' && (
        <section className="space-y-4">
          <SectionHeader
            title="Riwayat Transaksi Green Points"
            description="Menampilkan poin masuk dari verifikasi dan poin keluar dari penukaran reward."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9E0DC] bg-white px-4 py-3">
            <FilterBar
              ariaLabel="Filter jenis transaksi"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'Semua', label: 'Semua', count: transactions.length },
                {
                  value: 'Earned',
                  label: 'Poin Masuk',
                  count: earnedCount,
                },
                {
                  value: 'Redeemed',
                  label: 'Penukaran',
                  count: redeemedCount,
                },
              ]}
            />

            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#58655E]"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari sumber atau ID transaksi"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari keterangan atau ID..."
                className="w-full rounded-md border border-[#C5CEC9] bg-[#F8FAF9] py-1.5 pr-3 pl-8 text-xs text-[#1B231F] placeholder:text-[#78857E] transition-colors focus:border-[#1B5E43] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white">
            {filteredTransactions.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#58655E]">
                Tidak ada transaksi yang cocok dengan filter atau pencarian.
              </p>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-[#F8FAF9]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                        tx.type === 'Earned'
                          ? 'border-[#C5D9CD] bg-[#EFF5F2] text-[#1B5E43]'
                          : 'border-[#E8C5C5] bg-[#FDF3F3] text-[#A62626]'
                      }`}
                    >
                      {tx.type === 'Earned' ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-[#141B17]">
                        {tx.sourceLabel}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#58655E]">
                        <span
                          className={
                            tx.type === 'Earned'
                              ? 'text-[#1B5E43]'
                              : 'text-[#A62626]'
                          }
                        >
                          {tx.type === 'Earned' ? 'Masuk' : 'Keluar'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{tx.date}</span>
                        {tx.submissionId && (
                          <>
                            <span aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={() =>
                                onOpenTraceDetail(tx.submissionId!)
                              }
                              className="text-[#2B5E6B] hover:underline"
                            >
                              {tx.submissionId}
                            </button>
                          </>
                        )}
                        {tx.batchId && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{tx.batchId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-mono text-sm font-semibold tabular-nums ${
                        tx.type === 'Earned'
                          ? 'text-[#1B5E43]'
                          : 'text-[#A62626]'
                      }`}
                    >
                      {tx.signedPoints > 0
                        ? `+${tx.signedPoints}`
                        : tx.signedPoints}{' '}
                      GP
                    </p>
                    <p className="font-mono text-[11px] text-[#58655E] tabular-nums">
                      Saldo akhir: {tx.balanceAfter.toLocaleString('id-ID')} GP
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
