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
          <div className="rounded-md border border-[#C6DBC9] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#6B756F]">
                  Saldo Green Points Aktif
                </p>
                <p className="font-display text-3xl font-semibold tracking-tight text-[#245C45] tabular-nums">
                  {balanceSummary.balance.toLocaleString('id-ID')} GP
                </p>
                <p className="text-xs text-[#6B756F]">
                  Sistem poin insentif internal non-kripto (+
                  {POINTS_PER_ECOBRICK} GP per ecobrick terverifikasi).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
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
                  Tukarkan Poin
                </PrimaryButton>
              </div>
            </div>
          </div>

          <MetricStrip
            columns={3}
            items={[
              {
                label: 'Total Poin Diperoleh',
                value: `+${balanceSummary.earned.toLocaleString('id-ID')} GP`,
                hint: 'Dari kontribusi ecobrick terverifikasi',
                accent: 'primary',
              },
              {
                label: 'Total Poin Ditukar',
                value: `-${balanceSummary.redeemed.toLocaleString('id-ID')} GP`,
                hint: 'Penukaran di Green Marketplace',
              },
              {
                label: 'Jumlah Transaksi',
                value: `${transactions.length} mutasi`,
                hint: 'Klik untuk lihat buku mutasi lengkap',
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
            <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white">
              {transactions.length === 0 ? (
                <p className="p-6 text-center text-xs text-[#6B756F]">
                  Belum ada mutasi Green Points pada akun ini.
                </p>
              ) : (
                transactions.slice(0, 4).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[#FAFBF9]"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
                          tx.type === 'Earned'
                            ? 'border-[#C6DBC9] bg-[#E7F0E8] text-[#245C45]'
                            : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                        }`}
                      >
                        {tx.type === 'Earned' ? (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-[#252B28]">
                          {tx.sourceLabel}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#6B756F]">
                          <span>{tx.date}</span>
                          {tx.submissionId && (
                            <>
                              <span aria-hidden="true">·</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenTraceDetail(tx.submissionId!)
                                }
                                className="font-medium text-[#245C45] hover:underline"
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
                            ? 'text-[#245C45]'
                            : 'text-[#991B1B]'
                        }`}
                      >
                        {tx.signedPoints > 0
                          ? `+${tx.signedPoints}`
                          : tx.signedPoints}{' '}
                        GP
                      </p>
                      <p className="font-mono text-[11px] text-[#6B756F] tabular-nums">
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
              <div className="flex items-start gap-2 rounded border border-[#E5D3B3] bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Dukungan insentif khusus program komunitas & keluarga rentan
                  sesuai ketersediaan dana pesantren.
                </span>
              </div>
              <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white">
                {myIncentives.map((fin) => (
                  <div
                    key={fin.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-[#252B28]">
                        {fin.fundingSource} · Batch {fin.batchId}
                      </p>
                      <p className="text-[11px] text-[#6B756F]">
                        {fin.conditionNote}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold text-[#252B28] tabular-nums">
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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E3E8E4] bg-white px-4 py-3">
            <FilterBar
              ariaLabel="Filter jenis transaksi"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'Semua', label: 'Semua', count: transactions.length },
                {
                  value: 'Earned',
                  label: 'Poin Masuk',
                  count: transactions.filter((t) => t.type === 'Earned').length,
                },
                {
                  value: 'Redeemed',
                  label: 'Penukaran',
                  count: transactions.filter((t) => t.type === 'Redeemed')
                    .length,
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
                aria-label="Cari sumber atau ID transaksi"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari keterangan atau ID..."
                className="w-full rounded border border-[#CFD8D2] bg-[#F7F9F7] py-1.5 pr-3 pl-8 text-xs text-[#252B28] placeholder:text-[#8A948E] transition-colors focus:border-[#245C45] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white">
            {filteredTransactions.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#6B756F]">
                Tidak ada transaksi yang cocok dengan filter atau pencarian.
              </p>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[#FAFBF9]"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
                        tx.type === 'Earned'
                          ? 'border-[#C6DBC9] bg-[#E7F0E8] text-[#245C45]'
                          : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                      }`}
                    >
                      {tx.type === 'Earned' ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-[#252B28]">
                        {tx.sourceLabel}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#6B756F]">
                        <span
                          className={
                            tx.type === 'Earned'
                              ? 'text-[#245C45]'
                              : 'text-[#991B1B]'
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
                              className="text-[#245C45] hover:underline"
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
                          ? 'text-[#245C45]'
                          : 'text-[#991B1B]'
                      }`}
                    >
                      {tx.signedPoints > 0
                        ? `+${tx.signedPoints}`
                        : tx.signedPoints}{' '}
                      GP
                    </p>
                    <p className="font-mono text-[11px] text-[#6B756F] tabular-nums">
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
