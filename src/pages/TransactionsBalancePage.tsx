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
          {/* Obsidian Active Balance Hero Strip */}
          <section className="rounded-lg border border-[#243A31] bg-[#111E19] p-5 text-[#ECF2EE] sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1.5">
                <p className="font-mono text-xs font-medium text-[#6EE7B7]">
                  Saldo Green Points Aktif
                </p>
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="font-display text-3xl font-semibold tracking-tight text-white tabular-nums">
                    {balanceSummary.balance.toLocaleString('id-ID')} GP
                  </p>
                  <span className="font-mono text-xs text-[#9EB5AA]">
                    +{POINTS_PER_ECOBRICK} GP / ecobrick terverifikasi
                  </span>
                </div>
                <p className="text-xs text-[#9EB5AA]">
                  Sistem poin insentif internal non-kripto · {earnedCount} kali
                  perolehan · {redeemedCount} kali penukaran.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onChangeSubTab('ledger')}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-[#2D473B] bg-[#1A2C25] px-3.5 py-2 text-xs font-semibold text-[#ECF2EE] transition-colors duration-150 hover:border-[#6EE7B7] hover:text-white whitespace-nowrap"
                >
                  Riwayat Transaksi
                </button>
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
            <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D8DFDA] bg-white">
              {transactions.length === 0 ? (
                <p className="p-6 text-center text-xs text-[#54625B]">
                  Belum ada mutasi Green Points pada akun ini.
                </p>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-[#F8FAF8]"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                          tx.type === 'Earned'
                            ? 'border-[#B5CEC0] bg-[#EBF4EF] text-[#166549]'
                            : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                        }`}
                      >
                        {tx.type === 'Earned' ? (
                          <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-[#17201C]">
                          {tx.sourceLabel}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#54625B]">
                          <span>{tx.date}</span>
                          {tx.submissionId && (
                            <>
                              <span aria-hidden="true">·</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenTraceDetail(tx.submissionId!)
                                }
                                className="font-medium text-[#1D6373] hover:underline"
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
                            ? 'text-[#166549]'
                            : 'text-[#B91C1C]'
                        }`}
                      >
                        {tx.signedPoints > 0
                          ? `+${tx.signedPoints}`
                          : tx.signedPoints}{' '}
                        GP
                      </p>
                      <p className="font-mono text-[11px] text-[#54625B] tabular-nums">
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
              <div className="flex items-start gap-2.5 rounded-lg border border-[#FCD34D] bg-[#FEF3C7] p-3.5 text-xs text-[#B45309]">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Dukungan insentif khusus program komunitas &amp; keluarga
                  rentan sesuai ketersediaan dana pesantren.
                </span>
              </div>
              <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D8DFDA] bg-white">
                {myIncentives.map((fin) => (
                  <div
                    key={fin.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-[#17201C]">
                        {fin.fundingSource} · Batch {fin.batchId}
                      </p>
                      <p className="text-[11px] text-[#54625B]">
                        {fin.conditionNote}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold text-[#17201C] tabular-nums">
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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D8DFDA] bg-white px-4 py-3">
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
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#54625B]"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari sumber atau ID transaksi"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari keterangan atau ID..."
                className="w-full rounded-md border border-[#C6D1CA] bg-[#F8FAF8] py-1.5 pr-3 pl-8 text-xs text-[#17201C] placeholder:text-[#7D8C84] transition-colors focus:border-[#166549] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D8DFDA] bg-white">
            {filteredTransactions.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#54625B]">
                Tidak ada transaksi yang cocok dengan filter atau pencarian.
              </p>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-[#F8FAF8]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                        tx.type === 'Earned'
                          ? 'border-[#B5CEC0] bg-[#EBF4EF] text-[#166549]'
                          : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                      }`}
                    >
                      {tx.type === 'Earned' ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-[#17201C]">
                        {tx.sourceLabel}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#54625B]">
                        <span
                          className={
                            tx.type === 'Earned'
                              ? 'text-[#166549]'
                              : 'text-[#B91C1C]'
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
                              className="text-[#1D6373] hover:underline"
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
                          ? 'text-[#166549]'
                          : 'text-[#B91C1C]'
                      }`}
                    >
                      {tx.signedPoints > 0
                        ? `+${tx.signedPoints}`
                        : tx.signedPoints}{' '}
                      GP
                    </p>
                    <p className="font-mono text-[11px] text-[#54625B] tabular-nums">
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
