import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  Minus,
  PackagePlus,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type {
  EcobrickSubmission,
  PhysicalChecklist,
  TracecoState,
} from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
  isPenyerahRole,
} from '../utils/tracecoLogic';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';
import { SubNavTabs } from '../components/ui/SubNavTabs';
import { TraceabilityPage } from './TraceabilityPage';
import { VerificationTraceabilityPage } from './VerificationTraceabilityPage';

interface EcobrickContributionPageProps {
  state: TracecoState;
  activeSubTab: string;
  onChangeSubTab: (sub: string) => void;
  selectedTraceTargetId: string | null;
  onSelectTraceTargetId: (targetId: string) => void;
  onSubmitContribution: (payload: {
    contributorId: string;
    dropoffPointId: string;
    date: string;
    bottleSize: string;
    quantitySubmitted: number;
    weightKg?: number;
    iotSimulatedWeightKg?: number;
    photoDataUrl?: string;
    photoLabel?: string;
    notes?: string;
  }) => Promise<{ error?: string; submissionId?: string }> | { error?: string; submissionId?: string };
  onVerifySubmission: (params: {
    submissionId: string;
    verifierId: string;
    checklist: PhysicalChecklist;
    verifiedCount: number;
    rejectionReason?: string;
    verifiedWeightKg?: number;
  }) => Promise<{ error?: string; batchId?: string }> | { error?: string; batchId?: string };
  onInspectTarget: (targetId: string) => void;
}

const BOTTLE_STANDARDS = [
  {
    label: 'Botol PET 600 ml (Standar min. 250g/unit)',
    targetUnitKg: 0.27,
  },
  {
    label: 'Botol PET 1000 ml (Standar min. 400g/unit)',
    targetUnitKg: 0.42,
  },
  {
    label: 'Botol PET 1500 ml (Standar min. 500g/unit)',
    targetUnitKg: 0.52,
  },
];

const SAMPLE_ECOBRICK_PHOTO_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#F2F7F3"/><rect x="16" y="16" width="288" height="148" rx="6" fill="#FFFFFF" stroke="#C6DBC9"/><rect x="44" y="54" width="44" height="76" rx="8" fill="#E7F0E8" stroke="#245C45" stroke-width="2"/><rect x="56" y="42" width="20" height="12" rx="2" fill="#245C45"/><rect x="100" y="54" width="44" height="76" rx="8" fill="#E7F0E8" stroke="#245C45" stroke-width="2"/><rect x="112" y="42" width="20" height="12" rx="2" fill="#245C45"/><text x="166" y="76" font-family="sans-serif" font-size="13" font-weight="600" fill="#252B28">Dokumentasi Ecobrick</text><text x="166" y="96" font-family="sans-serif" font-size="11" fill="#6B756F">Botol PET Bersih &amp; Padat</text><text x="166" y="114" font-family="monospace" font-size="11" fill="#245C45">Siap Verifikasi Pos</text></svg>`
  );

export function EcobrickContributionPage({
  state,
  activeSubTab,
  onChangeSubTab,
  selectedTraceTargetId,
  onSelectTraceTargetId,
  onSubmitContribution,
  onVerifySubmission,
  onInspectTarget,
}: EcobrickContributionPageProps) {
  const isContributorView = isPenyerahRole(state.activeRole);
  const activeActorId = state.currentUserId ?? '';

  const eligibleContributors = state.contributors.filter(
    (c) => isPenyerahRole(c.role) || c.role === 'Admin'
  );

  // Submission wizard state (Isi Data -> Review -> Konfirmasi -> Berhasil)
  const [submitStep, setSubmitStep] = useState<'form' | 'review' | 'done'>(
    'form'
  );
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [showDropoffInfo, setShowDropoffInfo] = useState(false);
  const [showAdminIntakeForm, setShowAdminIntakeForm] = useState(false);

  const [selectedContributorId, setSelectedContributorId] = useState(
    isContributorView
      ? activeActorId
      : eligibleContributors[0]?.id ?? activeActorId
  );
  const [dropoffPointId, setDropoffPointId] = useState(
    state.dropoff_points[0]?.id ?? ''
  );
  const resolvedDropoffPointId = state.dropoff_points.some(
    (dp) => dp.id === dropoffPointId
  )
    ? dropoffPointId
    : state.dropoff_points[0]?.id ?? '';
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bottleSize, setBottleSize] = useState(BOTTLE_STANDARDS[0].label);
  const [quantitySubmitted, setQuantitySubmitted] = useState('10');
  const [weightKg, setWeightKg] = useState('');
  const [iotSimulatedWeightKg, setIotSimulatedWeightKg] = useState<
    number | undefined
  >(undefined);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(
    undefined
  );
  const [photoLabel, setPhotoLabel] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<
    'Semua' | EcobrickSubmission['status']
  >('Semua');
  const [historySearch, setHistorySearch] = useState('');

  const effectiveContributorId = isContributorView
    ? activeActorId
    : selectedContributorId;

  const activeContributor = state.contributors.find(
    (c) => c.id === effectiveContributorId
  );
  const selectedDropoff = state.dropoff_points.find(
    (dp) => dp.id === resolvedDropoffPointId
  );

  const contributorMap = new Map(state.contributors.map((c) => [c.id, c]));
  const verificationMap = new Map(
    state.verification_records.map((v) => [v.submissionId, v])
  );

  const pendingCount = state.ecobrick_submissions.filter(
    (s) => s.status === 'Pending'
  ).length;

  const activeBottleStandard =
    BOTTLE_STANDARDS.find((b) => b.label === bottleSize) ?? BOTTLE_STANDARDS[0];
  const liveQty = Math.max(0, parseInt(quantitySubmitted, 10) || 0);
  const liveTargetWeightKg = Number(
    (liveQty * activeBottleStandard.targetUnitKg).toFixed(2)
  );
  const liveEstimatedGp = liveQty * POINTS_PER_ECOBRICK;

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Ukuran file foto maksimal 5 MB.');
      return;
    }
    setFormError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const rawDataUrl = reader.result;
      if (rawDataUrl.length <= 360000) {
        setPhotoDataUrl(rawDataUrl);
        setPhotoLabel(file.name);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxDim = 760;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFormError('Gagal memproses foto. Coba pilih file yang lebih kecil.');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        if (compressed.length > 440000) {
          setFormError(
            'Foto terlalu detail untuk disimpan di database. Gunakan foto beresolusi lebih kecil.'
          );
          return;
        }
        setPhotoDataUrl(compressed);
        setPhotoLabel(file.name);
      };
      img.onerror = () => {
        setFormError('Format foto tidak didukung. Gunakan JPG atau PNG.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSimulateScale = () => {
    const qty = parseInt(quantitySubmitted, 10);
    if (!qty || qty <= 0) {
      setFormError(
        'Masukkan jumlah unit ecobrick minimal 1 sebelum membaca simulasi timbangan pos.'
      );
      return;
    }
    setFormError(null);
    const simulated = Number(
      (qty * activeBottleStandard.targetUnitKg + 0.04).toFixed(2)
    );
    setIotSimulatedWeightKg(simulated);
    setWeightKg(String(simulated));
  };

  const adjustQuantity = (delta: number) => {
    const next = Math.max(1, (parseInt(quantitySubmitted, 10) || 1) + delta);
    setQuantitySubmitted(String(next));
  };

  const validateBeforeReview = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!resolvedDropoffPointId) {
      setFormError(
        'Belum ada Pos Serah Eco-Hub yang tersedia di database. Hubungi Admin untuk menambahkan pos serah terlebih dahulu.'
      );
      return;
    }

    const parsedQty = parseInt(quantitySubmitted, 10);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      setFormError('Jumlah ecobrick yang diserahkan minimal 1 unit.');
      return;
    }

    const parsedWeight =
      weightKg.trim() !== '' ? parseFloat(weightKg) : undefined;
    if (
      parsedWeight !== undefined &&
      (Number.isNaN(parsedWeight) || parsedWeight <= 0)
    ) {
      setFormError('Jika berat diisi, nilainya harus lebih dari 0 kg.');
      return;
    }

    setSubmitStep('review');
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setFormError(null);
    setIsSubmitting(true);
    const parsedQty = parseInt(quantitySubmitted, 10);
    const parsedWeight =
      weightKg.trim() !== '' ? parseFloat(weightKg) : undefined;

    try {
      const res = await onSubmitContribution({
        contributorId: effectiveContributorId,
        dropoffPointId: resolvedDropoffPointId,
        date,
        bottleSize,
        quantitySubmitted: parsedQty,
        weightKg: parsedWeight,
        iotSimulatedWeightKg,
        photoDataUrl,
        photoLabel,
        notes,
      });

      if (res.error) {
        setFormError(res.error);
        setSubmitStep('form');
        return;
      }

      setLastSubmittedId(res.submissionId ?? null);
      if (res.submissionId) {
        onSelectTraceTargetId(res.submissionId);
      }
      setSubmitStep('done');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSubmitFlow = () => {
    setSubmitStep('form');
    setNotes('');
    setWeightKg('');
    setIotSimulatedWeightKg(undefined);
    setPhotoDataUrl(undefined);
    setPhotoLabel(undefined);
    setFormError(null);
  };

  const openContributionDetail = (submissionId: string) => {
    onSelectTraceTargetId(submissionId);
    if (isContributorView) {
      onChangeSubTab('trace');
    } else {
      onInspectTarget(submissionId);
    }
  };

  const currentTab = isContributorView
    ? ['submit', 'history', 'trace'].includes(activeSubTab)
      ? activeSubTab
      : 'submit'
    : ['all', 'verify', 'verify_history'].includes(activeSubTab)
      ? activeSubTab
      : 'all';

  const baseSubmissions = isContributorView
    ? state.ecobrick_submissions.filter(
        (s) => s.contributorId === effectiveContributorId
      )
    : state.ecobrick_submissions;

  const filteredSubmissions = baseSubmissions.filter((s) => {
    const matchStatus =
      historyFilter === 'Semua' ? true : s.status === historyFilter;
    const q = historySearch.trim().toLowerCase();
    if (!q) return matchStatus;
    const ctr = contributorMap.get(s.contributorId);
    const matchQuery =
      s.submissionId.toLowerCase().includes(q) ||
      s.dropoffPointName.toLowerCase().includes(q) ||
      (s.notes ?? '').toLowerCase().includes(q) ||
      (ctr?.name ?? '').toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const submissionColumns: DataTableColumn<EcobrickSubmission>[] = [
    {
      key: 'submissionId',
      header: 'Submission ID',
      render: (s) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openContributionDetail(s.submissionId);
          }}
          className="font-mono text-xs font-semibold text-[#245C45] hover:underline whitespace-nowrap"
        >
          {s.submissionId}
        </button>
      ),
    },
    ...(!isContributorView
      ? [
          {
            key: 'contributor',
            header: 'Kontributor',
            render: (s: EcobrickSubmission) => {
              const ctr = contributorMap.get(s.contributorId);
              return (
                <div className="space-y-0.5 text-xs">
                  <p className="font-medium text-[#252B28]">
                    {ctr?.name ?? '-'}
                  </p>
                  {ctr && (
                    <RoleTag
                      role={ctr.role}
                      segment={ctr.segment}
                      variant="inline"
                    />
                  )}
                </div>
              );
            },
          },
        ]
      : []),
    {
      key: 'date',
      header: 'Tanggal',
      render: (s) => (
        <span className="font-mono text-xs text-[#6B756F] tabular-nums whitespace-nowrap">
          {s.date}
        </span>
      ),
    },
    {
      key: 'qty',
      header: 'Jumlah',
      align: 'right',
      render: (s) => (
        <span className="font-mono text-xs font-medium tabular-nums whitespace-nowrap">
          {s.quantitySubmitted} unit
        </span>
      ),
    },
    {
      key: 'weight',
      header: 'Berat',
      align: 'right',
      render: (s) => (
        <span className="font-mono text-xs text-[#6B756F] tabular-nums whitespace-nowrap">
          {s.weightKg ? `${s.weightKg.toFixed(2)} kg` : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => {
        const ver = verificationMap.get(s.submissionId);
        return (
          <div className="space-y-1">
            <StatusTag status={s.status} />
            {ver?.rejectionReason && (
              <p className="max-w-[230px] text-[11px] text-[#991B1B]">
                Alasan: {ver.rejectionReason}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'reward',
      header: 'Green Points',
      align: 'right',
      render: (s) => {
        const pts = s.verifiedQuantity * POINTS_PER_ECOBRICK;
        return (
          <span className="font-mono text-xs font-semibold text-[#245C45] tabular-nums whitespace-nowrap">
            {pts > 0 ? `+${pts} GP` : '-'}
          </span>
        );
      },
    },
    {
      key: 'detail',
      header: 'Aksi',
      align: 'right',
      render: (s) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openContributionDetail(s.submissionId);
          }}
          className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#245C45] hover:border-[#245C45] hover:bg-[#E7F0E8] transition-colors duration-150 whitespace-nowrap"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span>{isContributorView ? 'Lacak' : 'Detail'}</span>
        </button>
      ),
    },
  ];

  const renderWizardStepper = () => {
    const steps: { id: 'form' | 'review' | 'done'; num: string; label: string }[] = [
      { id: 'form', num: '01', label: 'Isi Data Ecobrick' },
      { id: 'review', num: '02', label: 'Review & Estimasi' },
      { id: 'done', num: '03', label: 'Terkirim ke Pos' },
    ];
    const currentIdx = steps.findIndex((st) => st.id === submitStep);
    return (
      <ol
        aria-label="Tahap pengajuan ecobrick"
        className="grid grid-cols-3 gap-2 border-b border-[#EEF2EF] pb-4"
      >
        {steps.map((st, idx) => {
          const isCurrent = idx === currentIdx;
          const isDone = idx < currentIdx;
          return (
            <li
              key={st.id}
              className={`flex items-center gap-2 text-xs ${
                isCurrent
                  ? 'font-semibold text-[#245C45]'
                  : isDone
                    ? 'font-medium text-[#4F8A68]'
                    : 'text-[#6B756F]'
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
                  isCurrent
                    ? 'bg-[#245C45] text-white'
                    : isDone
                      ? 'bg-[#E7F0E8] text-[#245C45]'
                      : 'bg-[#F2F5F3] text-[#6B756F]'
                }`}
              >
                {st.num}
              </span>
              <span className="truncate">{st.label}</span>
            </li>
          );
        })}
      </ol>
    );
  };

  const renderSubmissionFlow = () => (
    <div className="space-y-5">
      {submitStep === 'form' && (
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 sm:p-6 space-y-5">
          {renderWizardStepper()}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeader
              title="Kirim Ecobrick"
              description="Isi data ecobrick jadi yang Anda serahkan ke pos Eco-Hub."
            />
            <button
              type="button"
              onClick={() => setShowDropoffInfo((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded border border-[#CFD8D2] bg-[#F7F9F7] px-3 py-1.5 text-xs font-medium text-[#245C45] hover:bg-[#E7F0E8] transition-colors duration-150"
            >
              <span>Jadwal Titik Serah</span>
              {showDropoffInfo ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {showDropoffInfo && (
            <div className="animate-traceco-enter grid grid-cols-1 gap-4 border-y border-[#E3E8E4] py-3.5 md:grid-cols-3">
              {state.dropoff_points.map((dp) => (
                <div key={dp.id} className="space-y-0.5 text-xs">
                  <p className="font-semibold text-[#252B28]">{dp.name}</p>
                  <p className="text-[11px] text-[#6B756F]">{dp.area}</p>
                  <p className="font-mono text-[11px] text-[#245C45]">
                    {dp.schedule}
                  </p>
                </div>
              ))}
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="rounded border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]"
            >
              {formError}
            </div>
          )}

          <form onSubmit={validateBeforeReview} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isContributorView ? (
                <FormField id="contrib-actor-readonly" label="Kontributor">
                  <div
                    id="contrib-actor-readonly"
                    className="flex items-center justify-between gap-2 rounded border border-[#E3E8E4] bg-[#F7F9F7] px-3 py-2 text-[13px] text-[#252B28]"
                  >
                    <span className="truncate font-medium">
                      {activeContributor?.name ?? 'Kontributor'}
                    </span>
                    <RoleTag
                      role={state.activeRole}
                      segment={activeContributor?.segment}
                      variant="inline"
                    />
                  </div>
                </FormField>
              ) : (
                <FormField id="contrib-select" label="Kontributor Penyerah">
                  <select
                    id="contrib-select"
                    value={selectedContributorId}
                    onChange={(e) => setSelectedContributorId(e.target.value)}
                    className={fieldInputClass}
                  >
                    {eligibleContributors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.segment})
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              <FormField id="dropoff-select" label="Lokasi Penyerahan (Drop-off)">
                {state.dropoff_points.length === 0 ? (
                  <p className="rounded border border-[#E5D3B3] bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]">
                    Belum ada Pos Serah aktif di database. Admin dapat
                    menambahkannya melalui menu Pengaturan → Profil Pesantren.
                  </p>
                ) : (
                  <select
                    id="dropoff-select"
                    value={resolvedDropoffPointId}
                    onChange={(e) => setDropoffPointId(e.target.value)}
                    className={fieldInputClass}
                  >
                    {state.dropoff_points.map((dp) => (
                      <option key={dp.id} value={dp.id}>
                        {dp.name}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="contrib-date" label="Tanggal Penyerahan">
                <input
                  id="contrib-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldInputClass}
                />
              </FormField>

              <FormField id="bottle-size" label="Ukuran Botol Ecobrick">
                <select
                  id="bottle-size"
                  value={bottleSize}
                  onChange={(e) => setBottleSize(e.target.value)}
                  className={fieldInputClass}
                >
                  {BOTTLE_STANDARDS.map((b) => (
                    <option key={b.label} value={b.label}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                id="quantity-submitted"
                label="Jumlah Ecobrick (Unit)"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustQuantity(-1)}
                      aria-label="Kurangi jumlah ecobrick"
                      className="rounded border border-[#CFD8D2] bg-white p-2 text-[#252B28] hover:bg-[#F7F9F7] active:scale-95 transition-transform duration-150"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <input
                      id="quantity-submitted"
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={quantitySubmitted}
                      onChange={(e) => setQuantitySubmitted(e.target.value)}
                      className={`${fieldInputClass} text-center font-mono font-semibold tabular-nums`}
                    />
                    <button
                      type="button"
                      onClick={() => adjustQuantity(1)}
                      aria-label="Tambah jumlah ecobrick"
                      className="rounded border border-[#CFD8D2] bg-white p-2 text-[#252B28] hover:bg-[#F7F9F7] active:scale-95 transition-transform duration-150"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-[#6B756F]">Cepat:</span>
                    {[5, 10, 20].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantitySubmitted(String(preset))}
                        className={`rounded border px-2 py-0.5 font-mono transition-colors duration-150 ${
                          liveQty === preset
                            ? 'border-[#245C45] bg-[#E7F0E8] font-semibold text-[#245C45]'
                            : 'border-[#E3E8E4] bg-[#F7F9F7] text-[#6B756F] hover:text-[#252B28]'
                        }`}
                      >
                        {preset} unit
                      </button>
                    ))}
                  </div>
                </div>
              </FormField>

              <FormField
                id="weight-kg"
                label="Berat (kg · Opsional)"
                hint="Kosongkan jika ditimbang langsung saat verifikasi di pos"
              >
                <div className="space-y-2">
                  <input
                    id="weight-kg"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder={`Target ideal ± ${liveTargetWeightKg} kg`}
                    className={fieldInputClass}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSimulateScale}
                      className="inline-flex items-center gap-1 font-medium text-[#245C45] hover:underline"
                    >
                      <Cpu className="h-3 w-3" aria-hidden="true" />
                      <span>Isi dari Simulasi Timbangan Pos</span>
                    </button>
                    {iotSimulatedWeightKg !== undefined && (
                      <span className="font-mono text-[#245C45] tabular-nums">
                        Timbangan: {iotSimulatedWeightKg} kg
                      </span>
                    )}
                  </div>
                </div>
              </FormField>
            </div>

            {/* Live Estimator Summary Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#EEF2EF] bg-[#F7F9F7]/70 px-3.5 py-2.5 text-xs">
              <span className="text-[#6B756F]">
                Target berat minimal standar:{' '}
                <strong className="font-mono text-[#252B28] tabular-nums">
                  {liveTargetWeightKg} kg
                </strong>{' '}
                ({liveQty} unit)
              </span>
              <span className="text-[#6B756F]">
                Potensi reward jika lolos semua:{' '}
                <strong className="font-mono text-[#245C45] tabular-nums">
                  +{liveEstimatedGp.toLocaleString('id-ID')} GP
                </strong>
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="contrib-photo"
                  className="text-xs font-medium text-[#252B28]"
                >
                  Foto Ecobrick (Opsional)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDataUrl(SAMPLE_ECOBRICK_PHOTO_SVG);
                    setPhotoLabel('contoh-ecobrick-pos.svg');
                  }}
                  className="text-[11px] font-medium text-[#245C45] hover:underline"
                >
                  Lampirkan Contoh Foto
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded border border-dashed border-[#CFD8D2] bg-[#FAFBF9] p-3">
                <label
                  htmlFor="contrib-photo"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[#CFD8D2] bg-white px-3 py-1.5 text-xs font-medium text-[#252B28] hover:bg-[#F7F9F7] transition-colors duration-150"
                >
                  <Camera className="h-3.5 w-3.5 text-[#245C45]" />
                  <span>Pilih File Foto</span>
                </label>
                <input
                  id="contrib-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
                <span className="text-xs text-[#6B756F] truncate">
                  {photoLabel ?? 'Belum ada foto dilampirkan (maks 2 MB)'}
                </span>
                {photoDataUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoDataUrl(undefined);
                      setPhotoLabel(undefined);
                    }}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#991B1B] hover:underline"
                  >
                    <X className="h-3 w-3" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              {photoDataUrl && (
                <img
                  src={photoDataUrl}
                  alt="Pratinjau foto ecobrick yang diserahkan"
                  className="h-24 w-auto rounded border border-[#E3E8E4] object-cover"
                />
              )}
            </div>

            <FormField id="contrib-notes" label="Catatan (Opsional)">
              <textarea
                id="contrib-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: 1 ikat kemasan plastik kering, tutup rapat."
                className={fieldInputClass}
              />
            </FormField>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF2EF] pt-3">
              <span className="text-[11px] text-[#6B756F]">
                +{POINTS_PER_ECOBRICK} GP / unit otomatis masuk saldo setelah
                verifikasi fisik pos.
              </span>
              <PrimaryButton type="submit">
                <span>Lanjut ke Review</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PrimaryButton>
            </div>
          </form>
        </section>
      )}

      {submitStep === 'review' && (
        <section className="animate-traceco-enter rounded-md border border-[#E3E8E4] bg-white p-5 sm:p-6 space-y-5">
          {renderWizardStepper()}
          <SectionHeader
            title="Review & Konfirmasi Kontribusi"
            description="Periksa kembali detail penyerahan Anda sebelum mengirim ke antrean verifikasi."
          />

          <dl className="divide-y divide-[#EEF2EF] border-y border-[#E3E8E4] text-xs">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[#6B756F]">Kontributor</dt>
              <dd className="font-medium text-[#252B28]">
                {activeContributor?.name ?? '-'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[#6B756F]">Lokasi Penyerahan</dt>
              <dd className="font-medium text-[#252B28]">
                {selectedDropoff?.name ?? resolvedDropoffPointId}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[#6B756F]">Tanggal</dt>
              <dd className="font-mono text-[#252B28]">{date}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[#6B756F]">Ukuran Botol</dt>
              <dd className="text-[#252B28]">{bottleSize}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[#6B756F]">Jumlah Unit</dt>
              <dd className="font-mono font-semibold text-[#252B28]">
                {quantitySubmitted} unit
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[#6B756F]">Berat Tercatat</dt>
              <dd className="font-mono text-[#252B28]">
                {weightKg.trim() ? `${weightKg} kg` : 'Ditimbang di pos'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[#6B756F]">Potensi Green Points</dt>
              <dd className="font-mono font-semibold text-[#245C45]">
                +{liveEstimatedGp.toLocaleString('id-ID')} GP (jika lolos semua)
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SecondaryButton
              disabled={isSubmitting}
              onClick={() => setSubmitStep('form')}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ubah Data</span>
            </SecondaryButton>
            <PrimaryButton
              disabled={isSubmitting}
              onClick={handleConfirmSubmit}
            >
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              <span>
                {isSubmitting
                  ? 'Menyimpan ke Pos...'
                  : 'Konfirmasi & Kirim Kontribusi'}
              </span>
            </PrimaryButton>
          </div>
        </section>
      )}

      {submitStep === 'done' && (
        <section className="animate-traceco-enter rounded-md border border-[#C6DBC9] bg-white p-5 sm:p-6 space-y-5">
          {renderWizardStepper()}
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#245C45]" />
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold text-[#252B28]">
                Submission Berhasil Dicatat
              </h2>
              <p className="text-xs text-[#6B756F]">
                Kontribusi Anda dengan ID{' '}
                <strong className="font-mono text-[#245C45]">
                  {lastSubmittedId}
                </strong>{' '}
                telah masuk ke antrean pos Eco-Hub.
              </p>
              <div className="pt-1">
                <StatusTag status="Pending" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#EEF2EF] pt-4">
            {lastSubmittedId && (
              <PrimaryButton
                size="sm"
                onClick={() => openContributionDetail(lastSubmittedId)}
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Lacak Kontribusi Ini</span>
              </PrimaryButton>
            )}
            <SecondaryButton
              size="sm"
              onClick={() => {
                resetSubmitFlow();
                onChangeSubTab('history');
              }}
            >
              Riwayat Kontribusi
            </SecondaryButton>
            <SecondaryButton size="sm" onClick={resetSubmitFlow}>
              Kirim Ecobrick Lagi
            </SecondaryButton>
          </div>
        </section>
      )}
    </div>
  );

  const renderHistoryList = (allowAdminCreate: boolean) => (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          title={isContributorView ? 'Riwayat Kontribusi' : 'Semua Kontribusi'}
          description="Klik baris, ID, atau tombol Lacak/Detail untuk melihat perjalanan lengkap verifikasi hingga pemanfaatan."
        />
        <div className="flex flex-wrap items-center gap-2">
          {allowAdminCreate && (
            <PrimaryButton
              size="sm"
              onClick={() => setShowAdminIntakeForm((v) => !v)}
            >
              <PackagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {showAdminIntakeForm ? 'Tutup Form Pos' : 'Catat Penerimaan Pos'}
              </span>
            </PrimaryButton>
          )}
        </div>
      </div>

      {allowAdminCreate && showAdminIntakeForm && (
        <div className="pb-2">{renderSubmissionFlow()}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          ariaLabel="Filter status kontribusi"
          value={historyFilter}
          onChange={setHistoryFilter}
          options={[
            { value: 'Semua', label: 'Semua', count: baseSubmissions.length },
            {
              value: 'Pending',
              label: 'Menunggu Verifikasi',
              count: baseSubmissions.filter((s) => s.status === 'Pending').length,
            },
            {
              value: 'Verified',
              label: 'Terverifikasi',
              count: baseSubmissions.filter((s) => s.status === 'Verified').length,
            },
            {
              value: 'Rejected',
              label: 'Ditolak',
              count: baseSubmissions.filter((s) => s.status === 'Rejected').length,
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
            aria-label="Cari ID submission atau lokasi"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Cari ID, pos, atau nama..."
            className="w-full rounded border border-[#CFD8D2] bg-white py-1.5 pr-3 pl-8 text-xs text-[#252B28] placeholder:text-[#8A948E] focus:border-[#245C45] focus:outline-none"
          />
        </div>
      </div>

      {/* Mobile Cards (< md) */}
      <div className="space-y-3 md:hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="rounded-md border border-[#E3E8E4] bg-white p-6 text-center text-xs text-[#6B756F]">
            Belum ada catatan kontribusi pada filter atau pencarian ini.
          </div>
        ) : (
          filteredSubmissions.map((s) => {
            const ctr = contributorMap.get(s.contributorId);
            const ver = verificationMap.get(s.submissionId);
            const pts = s.verifiedQuantity * POINTS_PER_ECOBRICK;
            return (
              <div
                key={s.submissionId}
                className="rounded-md border border-[#E3E8E4] bg-white p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#245C45]">
                      {s.submissionId}
                    </p>
                    <p className="font-mono text-[11px] text-[#6B756F]">
                      {s.date}
                      {!isContributorView && ctr ? ` · ${ctr.name}` : ''}
                    </p>
                  </div>
                  <StatusTag status={s.status} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2EF] pt-2 text-xs">
                  <span className="font-medium text-[#252B28]">
                    {s.quantitySubmitted} unit
                    {s.weightKg ? ` · ${s.weightKg.toFixed(2)} kg` : ''}
                  </span>
                  <span className="font-mono font-semibold text-[#245C45]">
                    {pts > 0 ? `+${pts} GP` : '-'}
                  </span>
                </div>

                {ver?.rejectionReason && (
                  <p className="text-[11px] text-[#991B1B]">
                    Alasan: {ver.rejectionReason}
                  </p>
                )}

                <SecondaryButton
                  size="sm"
                  onClick={() => openContributionDetail(s.submissionId)}
                  className="w-full"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Detail / Lacak Kontribusi</span>
                </SecondaryButton>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (md+) */}
      <div className="hidden md:block">
        <DataTable
          columns={submissionColumns}
          rows={filteredSubmissions}
          rowKey={(s) => s.submissionId}
          onRowClick={(s) => openContributionDetail(s.submissionId)}
          emptyMessage="Belum ada catatan kontribusi ecobrick pada pencarian ini."
        />
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kontribusi"
        description={
          isContributorView
            ? 'Kirim ecobrick jadi, pantau riwayat status verifikasi, dan lacak perjalanan kontribusi Anda.'
            : 'Kelola seluruh kontribusi masuk, pemeriksaan fisik 8 kriteria, dan riwayat verifikasi pos.'
        }
      />

      {isContributorView ? (
        <>
          <SubNavTabs
            ariaLabel="Submenu Kontribusi"
            activeId={currentTab}
            onChange={(tab) => {
              if (tab === 'submit' && submitStep === 'done') {
                resetSubmitFlow();
              }
              onChangeSubTab(tab);
            }}
            items={[
              { id: 'submit', label: 'Kirim Ecobrick' },
              {
                id: 'history',
                label: 'Riwayat Kontribusi',
                badge: baseSubmissions.length,
              },
              { id: 'trace', label: 'Lacak Kontribusi' },
            ]}
          />

          {currentTab === 'submit' && renderSubmissionFlow()}
          {currentTab === 'history' && renderHistoryList(false)}
          {currentTab === 'trace' && (
            <TraceabilityPage
              state={state}
              selectedTargetId={selectedTraceTargetId}
              onSelectTarget={onSelectTraceTargetId}
              onBack={() => onChangeSubTab('history')}
              embedded
            />
          )}
        </>
      ) : (
        <>
          <SubNavTabs
            ariaLabel="Submenu Kontribusi Admin"
            activeId={currentTab}
            onChange={onChangeSubTab}
            items={[
              {
                id: 'all',
                label: 'Semua Kontribusi',
                badge: state.ecobrick_submissions.length,
              },
              {
                id: 'verify',
                label: 'Verifikasi',
                badge: pendingCount,
              },
              {
                id: 'verify_history',
                label: 'Riwayat',
                badge: state.verification_records.length,
              },
            ]}
          />

          {currentTab === 'all' && renderHistoryList(true)}
          {currentTab === 'verify' && (
            <VerificationTraceabilityPage
              state={state}
              viewMode="queue"
              onVerifySubmission={onVerifySubmission}
              onInspectTarget={onInspectTarget}
              embedded
            />
          )}
          {currentTab === 'verify_history' && (
            <VerificationTraceabilityPage
              state={state}
              viewMode="history"
              onVerifySubmission={onVerifySubmission}
              onInspectTarget={onInspectTarget}
              embedded
            />
          )}
        </>
      )}
    </div>
  );
}
