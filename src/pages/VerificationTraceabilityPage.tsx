import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Eye,
  Lock,
  Minus,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type {
  EcobrickSubmission,
  PhysicalChecklist,
  SubmissionStatus,
  TracecoState,
  VerificationRecord,
} from '../types/traceco';
import {
  CHECKLIST_LABELS,
  POINTS_PER_ECOBRICK,
  canVerifySubmission,
  isVerifierRole,
} from '../utils/tracecoLogic';
import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';

interface VerificationTraceabilityPageProps {
  state: TracecoState;
  viewMode?: 'queue' | 'verified_list' | 'history';
  embedded?: boolean;
  onVerifySubmission: (params: {
    submissionId: string;
    verifierId: string;
    checklist: PhysicalChecklist;
    verifiedCount: number;
    rejectionReason?: string;
    verifiedWeightKg?: number;
  }) => Promise<{ error?: string; batchId?: string }> | { error?: string; batchId?: string };
  onInspectTarget: (targetId: string) => void;
  onOpenTraceDetail?: (targetId: string) => void;
}

const DEFAULT_CHECKLIST: PhysicalChecklist = {
  kondisiBotol: true,
  kebersihan: true,
  kekeringan: true,
  kepadatan: true,
  kondisiFisik: true,
  kesesuaianStandar: true,
  jumlahSesuai: true,
  beratSesuai: true,
};

const EMPTY_CHECKLIST: PhysicalChecklist = {
  kondisiBotol: false,
  kebersihan: false,
  kekeringan: false,
  kepadatan: false,
  kondisiFisik: false,
  kesesuaianStandar: false,
  jumlahSesuai: false,
  beratSesuai: false,
};

type QueueFilter = 'Semua' | SubmissionStatus;

export function VerificationTraceabilityPage({
  state,
  viewMode = 'queue',
  embedded = false,
  onVerifySubmission,
  onInspectTarget,
  onOpenTraceDetail,
}: VerificationTraceabilityPageProps) {
  const hasPending = state.ecobrick_submissions.some(
    (s) => s.status === 'Pending'
  );
  const [filter, setFilter] = useState<QueueFilter>(
    viewMode === 'verified_list'
      ? 'Verified'
      : viewMode === 'queue' && hasPending
        ? 'Pending'
        : 'Semua'
  );
  const [queueSearch, setQueueSearch] = useState('');

  useEffect(() => {
    if (viewMode === 'verified_list') {
      setFilter('Verified');
    } else if (viewMode === 'queue') {
      setFilter(
        state.ecobrick_submissions.some((s) => s.status === 'Pending')
          ? 'Pending'
          : 'Semua'
      );
    }
  }, [viewMode]);

  const verifierList = state.contributors.filter((c) =>
    isVerifierRole(c.role)
  );
  const canVerifyRole = isVerifierRole(state.activeRole);
  const activeActorId = state.currentUserId ?? '';

  const [selectedVerifierId, setSelectedVerifierId] = useState(
    canVerifyRole ? activeActorId : verifierList[0]?.id ?? activeActorId
  );

  useEffect(() => {
    if (canVerifyRole) {
      setSelectedVerifierId(activeActorId);
    }
  }, [canVerifyRole, activeActorId]);

  const effectiveVerifierId = canVerifyRole
    ? selectedVerifierId
    : verifierList[0]?.id ?? activeActorId;

  const firstPending = state.ecobrick_submissions.find(
    (s) => s.status === 'Pending'
  );
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>(
    firstPending?.submissionId ??
      state.ecobrick_submissions[0]?.submissionId ??
      ''
  );

  const selectedSubmission =
    state.ecobrick_submissions.find(
      (s) => s.submissionId === selectedSubmissionId
    ) ?? state.ecobrick_submissions[0];

  const [verifiedCountInput, setVerifiedCountInput] = useState<string>(
    String(selectedSubmission?.quantitySubmitted ?? 0)
  );
  const [verifiedWeightInput, setVerifiedWeightInput] = useState<string>('');
  const [checklist, setChecklist] =
    useState<PhysicalChecklist>(DEFAULT_CHECKLIST);
  const [rejectionReason, setRejectionReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSubmission) {
      setVerifiedCountInput(String(selectedSubmission.quantitySubmitted));
      setVerifiedWeightInput(
        selectedSubmission.weightKg
          ? String(selectedSubmission.weightKg)
          : ''
      );
      setChecklist(DEFAULT_CHECKLIST);
      setRejectionReason('');
      setFormError(null);
    }
  }, [selectedSubmission?.submissionId]);

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

  if (viewMode === 'history') {
    const historyColumns: DataTableColumn<VerificationRecord>[] = [
      {
        key: 'id',
        header: 'ID',
        sortValue: (v) => v.id,
        render: (v) => (
          <span className="font-mono text-xs font-semibold text-[#166549]">
            {v.id}
          </span>
        ),
      },
      {
        key: 'submissionId',
        header: 'Submission / Batch',
        sortValue: (v) => v.submissionId,
        render: (v) => (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openDetail(v.submissionId);
              }}
              className="font-mono text-xs font-semibold text-[#166549] hover:underline"
            >
              {v.submissionId}
            </button>
            {v.batchId && (
              <p className="font-mono text-[11px] text-[#1D6373]">
                Batch {v.batchId}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'verifier',
        header: 'Verifikator',
        sortValue: (v) => v.verifierName,
        render: (v) => (
          <span className="text-xs font-medium text-[#17201C]">
            {v.verifierName}
          </span>
        ),
      },
      {
        key: 'verifiedAt',
        header: 'Waktu Periksa',
        sortValue: (v) => v.verifiedAt,
        render: (v) => (
          <span className="font-mono text-xs text-[#54625B] tabular-nums whitespace-nowrap">
            {v.verifiedAt}
          </span>
        ),
      },
      {
        key: 'counts',
        header: 'Lolos / Tolak',
        align: 'right',
        sortValue: (v) => v.verifiedCount,
        render: (v) => (
          <span className="font-mono text-xs tabular-nums whitespace-nowrap">
            <span className="font-semibold text-[#166549]">
              {v.verifiedCount}
            </span>{' '}
            / <span className="text-[#B91C1C]">{v.rejectedCount}</span>
          </span>
        ),
      },
      {
        key: 'decision',
        header: 'Keputusan',
        sortValue: (v) => v.decision,
        render: (v) => (
          <div className="space-y-1">
            <StatusTag status={v.decision} />
            {v.rejectionReason && (
              <p className="max-w-[240px] text-[11px] text-[#B91C1C]">
                {v.rejectionReason}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'detail',
        header: 'Lacak',
        align: 'right',
        render: (v) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(v.submissionId);
            }}
            className="inline-flex items-center gap-1 rounded border border-[#C6D1CA] bg-white px-2.5 py-1 text-[11px] font-medium text-[#166549] hover:bg-[#EBF4EF] transition-colors"
          >
            <Eye className="h-3 w-3" />
            <span>Detail</span>
          </button>
        ),
      },
    ];

    return (
      <div className="space-y-6">
        {!embedded && (
          <PageHeader
            title="Riwayat Verifikasi"
            description="Rekam jejak seluruh inspeksi fisik ecobrick, alasan penolakan, dan penerbitan batch."
          />
        )}

        <div className="space-y-3 md:hidden">
          {state.verification_records.length === 0 ? (
            <div className="rounded-lg border border-[#D8DFDA] bg-white p-6 text-center text-xs text-[#54625B]">
              Belum ada riwayat pemeriksaan tercatat.
            </div>
          ) : (
            state.verification_records.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border border-[#D8DFDA] bg-white p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#166549]">
                      {v.submissionId}
                    </p>
                    <p className="font-mono text-[11px] text-[#54625B]">
                      {v.id}
                      {v.batchId ? ` · Batch ${v.batchId}` : ''}
                    </p>
                  </div>
                  <StatusTag status={v.decision} />
                </div>

                <div className="flex items-center justify-between border-t border-[#EAEFEA] pt-2 text-xs">
                  <span className="text-[#54625B]">{v.verifierName}</span>
                  <span className="font-mono tabular-nums">
                    <strong className="text-[#166549]">
                      {v.verifiedCount}
                    </strong>{' '}
                    / <span className="text-[#B91C1C]">{v.rejectedCount}</span>
                  </span>
                </div>

                {v.rejectionReason && (
                  <p className="text-[11px] text-[#B91C1C]">
                    Alasan: {v.rejectionReason}
                  </p>
                )}

                <SecondaryButton
                  size="sm"
                  onClick={() => openDetail(v.submissionId)}
                  className="w-full"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Lihat Traceability</span>
                </SecondaryButton>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block">
          <DataTable
            columns={historyColumns}
            rows={state.verification_records}
            rowKey={(v) => v.id}
            onRowClick={(v) => openDetail(v.submissionId)}
            emptyMessage="Belum ada riwayat pemeriksaan tercatat."
          />
        </div>
      </div>
    );
  }

  const filteredSubmissions = state.ecobrick_submissions.filter((s) => {
    const statusMatch =
      viewMode === 'verified_list'
        ? s.status === 'Verified' || s.status === 'Partially Verified'
        : filter === 'Semua'
          ? true
          : s.status === filter;
    const q = queueSearch.trim().toLowerCase();
    if (!q) return statusMatch;
    const ctr = contributorMap.get(s.contributorId);
    const queryMatch =
      s.submissionId.toLowerCase().includes(q) ||
      s.dropoffPointName.toLowerCase().includes(q) ||
      (ctr?.name ?? '').toLowerCase().includes(q);
    return statusMatch && queryMatch;
  });

  const parsedVerifiedCount = Math.max(
    0,
    Math.min(
      selectedSubmission?.quantitySubmitted ?? 0,
      parseInt(verifiedCountInput || '0', 10) || 0
    )
  );
  const computedRejectedCount = selectedSubmission
    ? Math.max(0, selectedSubmission.quantitySubmitted - parsedVerifiedCount)
    : 0;

  const passedCriteriaCount = CHECKLIST_LABELS.filter(
    (item) => checklist[item.key]
  ).length;
  const criteriaBarColor =
    passedCriteriaCount === 8
      ? 'bg-[#166549]'
      : passedCriteriaCount >= 5
        ? 'bg-[#1D6373]'
        : 'bg-[#D97706]';

  const guard = selectedSubmission
    ? canVerifySubmission(selectedSubmission, effectiveVerifierId)
    : { allowed: false, reason: 'Pilih submission terlebih dahulu.' };

  const existingVerification = selectedSubmission
    ? verificationMap.get(selectedSubmission.submissionId)
    : undefined;

  const selectedContributor = selectedSubmission
    ? contributorMap.get(selectedSubmission.contributorId)
    : undefined;

  const toggleCheck = (key: keyof PhysicalChecklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const adjustVerifiedCount = (delta: number) => {
    if (!selectedSubmission) return;
    const next = Math.max(
      0,
      Math.min(
        selectedSubmission.quantitySubmitted,
        parsedVerifiedCount + delta
      )
    );
    setVerifiedCountInput(String(next));
  };

  const handleSimulateVerificationScale = () => {
    if (!selectedSubmission) return;
    const avgPerUnit = selectedSubmission.bottleSize.includes('1500')
      ? 0.52
      : selectedSubmission.bottleSize.includes('1000')
        ? 0.41
        : 0.27;
    const simulated = Number((parsedVerifiedCount * avgPerUnit).toFixed(2));
    if (simulated > 0) {
      setVerifiedWeightInput(String(simulated));
    }
  };

  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmitVerification = async () => {
    if (!selectedSubmission || isVerifying) return;
    setFormError(null);
    setFeedbackMessage(null);

    if (!canVerifyRole) {
      setFormError(
        'Hanya peran Admin yang dapat menyimpan keputusan verifikasi fisik.'
      );
      return;
    }

    const parsedWeight =
      verifiedWeightInput.trim() !== ''
        ? parseFloat(verifiedWeightInput)
        : undefined;

    setIsVerifying(true);
    try {
      const res = await onVerifySubmission({
        submissionId: selectedSubmission.submissionId,
        verifierId: effectiveVerifierId,
        checklist,
        verifiedCount: parsedVerifiedCount,
        rejectionReason,
        verifiedWeightKg:
          parsedWeight && !Number.isNaN(parsedWeight) && parsedWeight > 0
            ? parsedWeight
            : undefined,
      });

      if (res.error) {
        setFormError(res.error);
        return;
      }

      if (parsedVerifiedCount > 0 && computedRejectedCount === 0) {
        setFeedbackMessage(
          `${selectedSubmission.submissionId} disetujui penuh (${parsedVerifiedCount} unit) → Batch ${res.batchId ?? '-'} dibuat & +${parsedVerifiedCount * POINTS_PER_ECOBRICK} Green Points dicatat.`
        );
      } else if (parsedVerifiedCount > 0 && computedRejectedCount > 0) {
        setFeedbackMessage(
          `${selectedSubmission.submissionId} diverifikasi sebagian: ${parsedVerifiedCount} unit Terverifikasi (Batch ${res.batchId ?? '-'}, +${parsedVerifiedCount * POINTS_PER_ECOBRICK} Green Points) dan ${computedRejectedCount} unit Ditolak.`
        );
      } else {
        setFeedbackMessage(
          `${selectedSubmission.submissionId} ditolak seluruhnya (${computedRejectedCount} unit Ditolak) dengan alasan penolakan tercatat.`
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const queueColumns: DataTableColumn<EcobrickSubmission>[] = [
    {
      key: 'submissionId',
      header: 'Submission ID',
      sortValue: (s) => s.submissionId,
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-[#166549]">
          {s.submissionId}
        </span>
      ),
    },
    {
      key: 'contributor',
      header: 'Kontributor',
      sortValue: (s) => contributorMap.get(s.contributorId)?.name ?? '',
      render: (s) => {
        const ctr = contributorMap.get(s.contributorId);
        return (
          <div className="space-y-0.5 text-xs">
            <p className="font-medium text-[#17201C]">{ctr?.name ?? '-'}</p>
            {ctr && (
              <RoleTag role={ctr.role} segment={ctr.segment} variant="inline" />
            )}
          </div>
        );
      },
    },
    {
      key: 'date',
      header: 'Tanggal',
      sortValue: (s) => s.date,
      render: (s) => (
        <span className="font-mono text-xs text-[#54625B] tabular-nums whitespace-nowrap">
          {s.date}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Jumlah',
      align: 'right',
      sortValue: (s) => s.quantitySubmitted,
      render: (s) => (
        <span className="font-mono text-xs tabular-nums whitespace-nowrap">
          {s.quantitySubmitted} unit
        </span>
      ),
    },
    {
      key: 'weight',
      header: 'Berat',
      align: 'right',
      sortValue: (s) => s.weightKg ?? 0,
      render: (s) => (
        <span className="font-mono text-xs text-[#54625B] tabular-nums whitespace-nowrap">
          {s.weightKg ? `${s.weightKg.toFixed(2)} kg` : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (s) => s.status,
      render: (s) => <StatusTag status={s.status} />,
    },
    {
      key: 'action',
      header: 'Aksi',
      align: 'right',
      render: (s) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <SecondaryButton
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSubmissionId(s.submissionId);
              setFeedbackMessage(null);
            }}
          >
            {s.status === 'Pending' ? 'Periksa' : 'Detail'}
          </SecondaryButton>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(s.submissionId);
            }}
            aria-label={`Lihat traceability ${s.submissionId}`}
            className="rounded border border-[#C6D1CA] bg-white p-1.5 text-[#166549] hover:bg-[#EBF4EF] transition-colors"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title={
            viewMode === 'verified_list'
              ? 'Kontribusi Terverifikasi'
              : 'Verifikasi & Pemeriksaan Fisik'
          }
          description={
            viewMode === 'verified_list'
              ? 'Daftar kontribusi ecobrick yang telah lolos verifikasi fisik dan masuk batch inventori.'
              : 'Pemeriksaan fisik 8 kriteria sebelum ecobrick jadi masuk inventori dan memperoleh Green Points.'
          }
        />
      )}

      {feedbackMessage && (
        <div
          role="status"
          className="animate-traceco-enter flex items-start gap-2 rounded-lg border border-[#B5CEC0] bg-[#EBF4EF] px-4 py-3 text-xs font-medium text-[#166549]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* 1. Verification Queue */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader
            title={
              viewMode === 'verified_list'
                ? 'Kontribusi Terverifikasi'
                : 'Daftar Kontribusi untuk Verifikasi'
            }
          />
          <div className="relative w-full sm:w-60">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#54625B]"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Cari submission antrean verifikasi"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Cari ID atau penyerah..."
              className="w-full rounded-md border border-[#C6D1CA] bg-white py-1.5 pr-3 pl-8 text-xs text-[#17201C] placeholder:text-[#7D8C84] focus:border-[#166549] focus:outline-none"
            />
          </div>
        </div>

        {viewMode === 'queue' && (
          <FilterBar
            ariaLabel="Filter status submission"
            value={filter}
            onChange={setFilter}
            options={[
              {
                value: 'Pending',
                label: 'Perlu Diverifikasi',
                count: state.ecobrick_submissions.filter(
                  (s) => s.status === 'Pending'
                ).length,
              },
              {
                value: 'Partially Verified',
                label: 'Sebagian',
                count: state.ecobrick_submissions.filter(
                  (s) => s.status === 'Partially Verified'
                ).length,
              },
              {
                value: 'Verified',
                label: 'Terverifikasi',
                count: state.ecobrick_submissions.filter(
                  (s) => s.status === 'Verified'
                ).length,
              },
              {
                value: 'Rejected',
                label: 'Ditolak',
                count: state.ecobrick_submissions.filter(
                  (s) => s.status === 'Rejected'
                ).length,
              },
              {
                value: 'Semua',
                label: 'Semua',
                count: state.ecobrick_submissions.length,
              },
            ]}
          />
        )}

        {/* Mobile Cards (< md) */}
        <div className="space-y-3 md:hidden">
          {filteredSubmissions.length === 0 ? (
            <div className="rounded-lg border border-[#D8DFDA] bg-white p-6 text-center text-xs text-[#54625B]">
              Tidak ada submission pada kategori filter ini.
            </div>
          ) : (
            filteredSubmissions.map((s) => {
              const ctr = contributorMap.get(s.contributorId);
              const isSelected =
                selectedSubmission?.submissionId === s.submissionId;
              return (
                <div
                  key={s.submissionId}
                  className={`rounded-lg border p-4 space-y-2.5 ${
                    isSelected
                      ? 'border-[#166549] bg-[#EBF4EF]/40'
                      : 'border-[#D8DFDA] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-[#166549]">
                        {s.submissionId}
                      </p>
                      <p className="text-xs font-medium text-[#17201C]">
                        {ctr?.name ?? '-'}
                      </p>
                      <p className="font-mono text-[11px] text-[#54625B]">
                        {s.date} · {s.dropoffPointName}
                      </p>
                    </div>
                    <StatusTag status={s.status} />
                  </div>

                  <div className="flex items-center justify-between border-t border-[#EAEFEA] pt-2 text-xs">
                    <span className="font-mono font-medium text-[#17201C]">
                      {s.quantitySubmitted} unit
                      {s.weightKg ? ` · ${s.weightKg.toFixed(2)} kg` : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <SecondaryButton
                        size="sm"
                        onClick={() => {
                          setSelectedSubmissionId(s.submissionId);
                          setFeedbackMessage(null);
                        }}
                      >
                        {s.status === 'Pending' ? 'Periksa' : 'Detail'}
                      </SecondaryButton>
                      <button
                        type="button"
                        onClick={() => openDetail(s.submissionId)}
                        aria-label={`Trace ${s.submissionId}`}
                        className="rounded border border-[#C6D1CA] bg-white p-1.5 text-[#166549]"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table (md+) */}
        <div className="hidden md:block">
          <DataTable
            columns={queueColumns}
            rows={filteredSubmissions}
            rowKey={(s) => s.submissionId}
            selectedRowKey={selectedSubmission?.submissionId}
            onRowClick={(s) => {
              setSelectedSubmissionId(s.submissionId);
              setFeedbackMessage(null);
            }}
            emptyMessage="Tidak ada submission pada kategori filter ini."
          />
        </div>
      </section>

      {/* 2. Physical Inspection Panel */}
      {viewMode === 'queue' && selectedSubmission && (
        <section className="rounded-lg border border-[#D8DFDA] bg-white p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D8DFDA] pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-semibold text-[#166549]">
                  {selectedSubmission.submissionId}
                </span>
                <StatusTag status={selectedSubmission.status} />
              </div>
              <p className="text-xs text-[#54625B]">
                Penyerah:{' '}
                <strong className="font-medium text-[#17201C]">
                  {selectedContributor?.name ?? '-'}
                </strong>{' '}
                ({selectedContributor?.segment ?? selectedContributor?.role ?? '-'}) ·{' '}
                {selectedSubmission.dropoffPointName} ·{' '}
                {selectedSubmission.bottleSize}
              </p>
              {selectedSubmission.notes && (
                <p className="text-xs text-[#17201C]">
                  Catatan: {selectedSubmission.notes}
                </p>
              )}
              {selectedSubmission.iotSimulatedWeightKg !== undefined && (
                <p className="font-mono text-[11px] text-[#1D6373]">
                  Timbangan pos (Simulasi IoT):{' '}
                  {selectedSubmission.iotSimulatedWeightKg} kg
                </p>
              )}
              {selectedSubmission.photoDataUrl && (
                <div className="pt-2">
                  <img
                    src={selectedSubmission.photoDataUrl}
                    alt={`Foto ${selectedSubmission.submissionId}`}
                    className="h-24 w-auto rounded-md border border-[#D8DFDA] object-cover"
                  />
                </div>
              )}
            </div>

            <SecondaryButton
              size="sm"
              onClick={() => openDetail(selectedSubmission.submissionId)}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Detail Kontribusi &amp; QR</span>
            </SecondaryButton>
          </div>

          {selectedSubmission.status !== 'Pending' && existingVerification ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-display text-sm font-semibold text-[#17201C]">
                  Hasil Keputusan Verifikasi Tercatat
                </h3>
                <dl className="divide-y divide-[#EAEFEA] border-y border-[#D8DFDA] text-xs">
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-[#54625B]">Pemeriksa Fisik</dt>
                    <dd className="font-medium text-[#17201C]">
                      {existingVerification.verifierName}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-[#54625B]">Waktu Pemeriksaan</dt>
                    <dd className="font-mono text-[#17201C] tabular-nums">
                      {existingVerification.verifiedAt}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-[#54625B]">Unit Lolos</dt>
                    <dd className="font-mono font-semibold text-[#166549] tabular-nums">
                      {existingVerification.verifiedCount} unit
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-[#54625B]">Unit Ditolak</dt>
                    <dd className="font-mono font-semibold text-[#B91C1C] tabular-nums">
                      {existingVerification.rejectedCount} unit
                    </dd>
                  </div>
                  {existingVerification.batchId && (
                    <div className="flex items-center justify-between py-2">
                      <dt className="text-[#54625B]">Batch Inventori</dt>
                      <dd className="font-mono font-semibold text-[#1D6373]">
                        {existingVerification.batchId}
                      </dd>
                    </div>
                  )}
                </dl>

                {existingVerification.rejectionReason && (
                  <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs text-[#B91C1C]">
                    <p className="font-semibold">Alasan Penolakan Tercatat:</p>
                    <p className="mt-1">{existingVerification.rejectionReason}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-display text-sm font-semibold text-[#17201C]">
                  Ringkasan 8 Kriteria Pemeriksaan Fisik
                </h3>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {CHECKLIST_LABELS.map((item) => {
                    const passed = existingVerification.checklist[item.key];
                    return (
                      <div
                        key={item.key}
                        className={`rounded-md border px-3 py-2 text-[11px] ${
                          passed
                            ? 'border-[#B5CEC0] bg-[#EBF4EF] text-[#166549]'
                            : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                        }`}
                      >
                        <span className="font-semibold">
                          {passed ? 'Lolos: ' : 'Gagal: '}
                        </span>
                        {item.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {!canVerifyRole && (
                <div className="flex items-start gap-2 rounded-md border border-[#FCD34D] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#B45309]">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Hanya peran <strong>Admin</strong> yang dapat menyimpan
                    keputusan verifikasi fisik.
                  </span>
                </div>
              )}

              {!guard.allowed && guard.reason && (
                <div className="flex items-start gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{guard.reason}</span>
                </div>
              )}

              {formError && (
                <div
                  role="alert"
                  className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]"
                >
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Checklist */}
                <div className="space-y-3 lg:col-span-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-display text-sm font-semibold text-[#17201C]">
                        Checklist Pemeriksaan Fisik
                      </h3>
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          passedCriteriaCount === 8
                            ? 'text-[#166549]'
                            : passedCriteriaCount >= 5
                              ? 'text-[#1D6373]'
                              : 'text-[#B45309]'
                        }`}
                      >
                        {passedCriteriaCount}/8 kriteria
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChecklist(DEFAULT_CHECKLIST)}
                        className="text-[11px] font-medium text-[#166549] hover:underline"
                      >
                        Centang Semua
                      </button>
                      <span className="text-[#C6D1CA]">·</span>
                      <button
                        type="button"
                        onClick={() => setChecklist(EMPTY_CHECKLIST)}
                        className="text-[11px] font-medium text-[#54625B] hover:underline"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  {/* Live Criteria Readiness Bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E3E9E5]">
                    <div
                      className={`h-full rounded-full transition-[width,background-color] duration-200 ${criteriaBarColor}`}
                      style={{
                        width: `${Math.round((passedCriteriaCount / 8) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {CHECKLIST_LABELS.map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-start gap-2.5 rounded-md border p-3 text-xs cursor-pointer transition-colors duration-150 ${
                          checklist[item.key]
                            ? 'border-[#B5CEC0] bg-[#EBF4EF]/55 text-[#17201C]'
                            : 'border-[#D8DFDA] bg-white text-[#54625B] hover:bg-[#F8FAF8]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checklist[item.key]}
                          onChange={() => toggleCheck(item.key)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#166549]"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Decision & Partial Verification Controls */}
                <div className="space-y-4 rounded-lg border border-[#D8DFDA] bg-[#F8FAF8] p-4 lg:col-span-5">
                  <h3 className="font-display text-sm font-semibold text-[#17201C]">
                    Keputusan Verifikasi &amp; Batch
                  </h3>

                  {canVerifyRole && (
                    <FormField
                      id="verifier-select"
                      label="Admin Pemeriksa"
                      hint="Jika submission milik sendiri, pilih pemeriksa lain"
                    >
                      <select
                        id="verifier-select"
                        value={selectedVerifierId}
                        onChange={(e) => setSelectedVerifierId(e.target.value)}
                        className={fieldInputClass}
                      >
                        {verifierList.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.role})
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}

                  {/* Interactive Range Slider + Steppers for Verified vs Rejected Split */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#17201C]">
                        Alokasi Unit Lolos vs Ditolak
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-[#166549] tabular-nums">
                        {parsedVerifiedCount} / {selectedSubmission.quantitySubmitted}
                      </span>
                    </div>

                    <input
                      type="range"
                      aria-label="Geser jumlah unit lolos verifikasi"
                      min={0}
                      max={selectedSubmission.quantitySubmitted}
                      step={1}
                      value={parsedVerifiedCount}
                      onChange={(e) => setVerifiedCountInput(e.target.value)}
                      className="w-full accent-[#166549] cursor-pointer"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        id="verified-count-input"
                        label="Unit Lolos"
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustVerifiedCount(-1)}
                            aria-label="Kurangi unit lolos"
                            className="rounded border border-[#C6D1CA] bg-white p-1.5 text-[#17201C] hover:bg-[#F2F4F2]"
                          >
                            <Minus className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <input
                            id="verified-count-input"
                            type="number"
                            min={0}
                            max={selectedSubmission.quantitySubmitted}
                            step={1}
                            value={verifiedCountInput}
                            onChange={(e) => setVerifiedCountInput(e.target.value)}
                            className={`${fieldInputClass} text-center font-mono font-semibold tabular-nums`}
                          />
                          <button
                            type="button"
                            onClick={() => adjustVerifiedCount(1)}
                            aria-label="Tambah unit lolos"
                            className="rounded border border-[#C6D1CA] bg-white p-1.5 text-[#17201C] hover:bg-[#F2F4F2]"
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>
                      </FormField>

                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-[#17201C]">
                          Unit Ditolak
                        </span>
                        <div className="rounded-md border border-[#D8DFDA] bg-white px-3 py-2 font-mono text-[13px] font-semibold text-[#B91C1C] tabular-nums">
                          {computedRejectedCount} unit
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setVerifiedCountInput(
                          String(selectedSubmission.quantitySubmitted)
                        )
                      }
                      className="rounded border border-[#C6D1CA] bg-white px-2 py-1 text-[11px] font-medium text-[#166549] hover:bg-[#EBF4EF] transition-colors duration-150"
                    >
                      Lolos Semua ({selectedSubmission.quantitySubmitted})
                    </button>
                    {selectedSubmission.quantitySubmitted >= 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setVerifiedCountInput(
                            String(
                              Math.max(
                                1,
                                selectedSubmission.quantitySubmitted - 2
                              )
                            )
                          )
                        }
                        className="rounded border border-[#C6D1CA] bg-white px-2 py-1 text-[11px] font-medium text-[#17201C] hover:bg-[#F2F4F2] transition-colors duration-150"
                      >
                        Parsial ({selectedSubmission.quantitySubmitted - 2} / 2)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setVerifiedCountInput('0')}
                      className="rounded border border-[#FCA5A5] bg-white px-2 py-1 text-[11px] font-medium text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors duration-150"
                    >
                      Tolak Semua
                    </button>
                  </div>

                  <FormField
                    id="verified-weight-input"
                    label="Berat Terverifikasi (kg · Opsional)"
                  >
                    <div className="flex gap-2">
                      <input
                        id="verified-weight-input"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={verifiedWeightInput}
                        onChange={(e) => setVerifiedWeightInput(e.target.value)}
                        placeholder="Contoh: 2.20"
                        className={fieldInputClass}
                      />
                      <SecondaryButton
                        size="sm"
                        onClick={handleSimulateVerificationScale}
                      >
                        Simulasi IoT
                      </SecondaryButton>
                    </div>
                  </FormField>

                  <FormField
                    id="rejection-reason"
                    label={
                      computedRejectedCount > 0
                        ? 'Alasan Penolakan (Wajib Diisi)'
                        : 'Catatan Pemeriksaan (Opsional)'
                    }
                  >
                    <textarea
                      id="rejection-reason"
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={
                        computedRejectedCount > 0
                          ? 'Contoh: 2 botol kurang padat dan tutup botol retak.'
                          : 'Catatan tambahan kondisi fisik lot.'
                      }
                      className={fieldInputClass}
                    />
                  </FormField>

                  {/* Obsidian Batch & GP Output Summary */}
                  <div className="rounded-lg border border-[#243A31] bg-[#111E19] p-3.5 text-xs text-[#C8D8D0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Green Points Otomatis</span>
                      <span className="font-mono font-semibold text-[#6EE7B7] tabular-nums">
                        +{parsedVerifiedCount * POINTS_PER_ECOBRICK} GP
                      </span>
                    </div>
                    <p className="text-[11px] text-[#89A296]">
                      {parsedVerifiedCount > 0
                        ? `Batch baru berisi ${parsedVerifiedCount} unit akan masuk inventori setelah disimpan.`
                        : 'Seluruh unit ditolak: tidak ada batch atau Green Points diterbitkan.'}
                    </p>
                  </div>

                  <div className="pt-1">
                    {parsedVerifiedCount > 0 ? (
                      <PrimaryButton
                        disabled={!canVerifyRole || !guard.allowed || isVerifying}
                        onClick={handleSubmitVerification}
                        className="w-full"
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {isVerifying
                            ? 'Menyimpan Verifikasi...'
                            : computedRejectedCount > 0
                              ? `Verifikasi Sebagian (${parsedVerifiedCount} Lolos)`
                              : `Verifikasi & Terbitkan Batch`}
                        </span>
                      </PrimaryButton>
                    ) : (
                      <DangerButton
                        disabled={!canVerifyRole || !guard.allowed || isVerifying}
                        onClick={handleSubmitVerification}
                        className="w-full"
                      >
                        <span>
                          {isVerifying
                            ? 'Menyimpan Penolakan...'
                            : `Tolak Submission (${computedRejectedCount} Ditolak)`}
                        </span>
                      </DangerButton>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. Concise Future IoT & Audit Layer Architecture */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-[#D8DFDA] bg-white p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1D6373]">
            <Cpu className="h-4 w-4" aria-hidden="true" />
            <span>Future IoT Integration · Simulated IoT Data</span>
          </div>
          <p className="font-mono text-[11px] text-[#54625B]">
            Load Cell → HX711 → ESP32 → Platform (data timbangan berstatus
            simulasi)
          </p>
        </section>

        <section className="rounded-lg border border-[#D8DFDA] bg-white p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#166549]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Conceptual Audit Layer (Non-Crypto)</span>
          </div>
          <p className="font-mono text-[11px] text-[#54625B]">
            Submission → Verification → Reward → Inventory → Distribution
          </p>
        </section>
      </div>
    </div>
  );
}
