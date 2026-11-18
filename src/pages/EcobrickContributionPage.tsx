import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Camera,
  CheckCircle2,
  Cpu,
  Eye,
  PackagePlus,
  X,
} from 'lucide-react';
import type { EcobrickSubmission, TracecoState } from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
  isPenyerahRole,
} from '../utils/tracecoLogic';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';

interface EcobrickContributionPageProps {
  state: TracecoState;
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
  }) => { error?: string; submissionId?: string };
  onInspectTarget: (targetId: string) => void;
  onOpenTraceDetail: (targetId: string) => void;
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

// Clean deterministic inline SVG data URL for quick sample photo preview in prototype
const SAMPLE_ECOBRICK_PHOTO_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#F2F7F3"/><rect x="16" y="16" width="288" height="148" rx="6" fill="#FFFFFF" stroke="#C6DBC9"/><rect x="44" y="54" width="44" height="76" rx="8" fill="#E7F0E8" stroke="#245C45" stroke-width="2"/><rect x="56" y="42" width="20" height="12" rx="2" fill="#245C45"/><rect x="100" y="54" width="44" height="76" rx="8" fill="#E7F0E8" stroke="#245C45" stroke-width="2"/><rect x="112" y="42" width="20" height="12" rx="2" fill="#245C45"/><text x="166" y="76" font-family="sans-serif" font-size="13" font-weight="600" fill="#252B28">Dokumentasi Ecobrick</text><text x="166" y="96" font-family="sans-serif" font-size="11" fill="#6B756F">Botol PET Bersih &amp; Padat</text><text x="166" y="114" font-family="monospace" font-size="11" fill="#245C45">Siap Verifikasi Pos</text></svg>`
  );

export function EcobrickContributionPage({
  state,
  onSubmitContribution,
  onOpenTraceDetail,
}: EcobrickContributionPageProps) {
  const isPersonalPenyerah = isPenyerahRole(state.activeRole);
  const activeActorId = state.activeActorIdByRole[state.activeRole];

  const eligibleContributors = state.contributors.filter(
    (c) => isPenyerahRole(c.role) || c.role === 'Admin'
  );

  const [selectedContributorId, setSelectedContributorId] = useState(
    isPersonalPenyerah
      ? activeActorId
      : eligibleContributors[0]?.id ?? 'CTR-SAN-01'
  );
  const [dropoffPointId, setDropoffPointId] = useState(
    state.dropoff_points[0]?.id ?? 'DP-01'
  );
  const [date, setDate] = useState('2026-11-18');
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const effectiveContributorId = isPersonalPenyerah
    ? activeActorId
    : selectedContributorId;

  const activeContributor = state.contributors.find(
    (c) => c.id === effectiveContributorId
  );

  const contributorMap = new Map(state.contributors.map((c) => [c.id, c]));
  const verificationMap = new Map(
    state.verification_records.map((v) => [v.submissionId, v])
  );

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Ukuran foto maksimal 2 MB.');
      return;
    }
    setFormError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoDataUrl(reader.result);
        setPhotoLabel(file.name);
      }
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
    const std =
      BOTTLE_STANDARDS.find((b) => b.label === bottleSize) ??
      BOTTLE_STANDARDS[0];
    const simulated = Number((qty * std.targetUnitKg + 0.04).toFixed(2));
    setIotSimulatedWeightKg(simulated);
    setWeightKg(String(simulated));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

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

    const res = onSubmitContribution({
      contributorId: effectiveContributorId,
      dropoffPointId,
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
      return;
    }

    setSuccessMessage(
      `Submission ${res.submissionId ?? ''} berhasil dicatat (${parsedQty} unit) dengan status Pending.`
    );
    setNotes('');
    setWeightKg('');
    setIotSimulatedWeightKg(undefined);
    setPhotoDataUrl(undefined);
    setPhotoLabel(undefined);
  };

  const submissionRows = isPersonalPenyerah
    ? state.ecobrick_submissions.filter(
        (s) => s.contributorId === effectiveContributorId
      )
    : state.ecobrick_submissions;

  const submissionColumns: DataTableColumn<EcobrickSubmission>[] = [
    {
      key: 'submissionId',
      header: 'ID',
      render: (s) => (
        <button
          type="button"
          onClick={() => onOpenTraceDetail(s.submissionId)}
          className="font-mono text-xs font-semibold text-[#245C45] hover:underline whitespace-nowrap"
        >
          {s.submissionId}
        </button>
      ),
    },
    ...(!isPersonalPenyerah
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
                  {ctr && <RoleTag role={ctr.role} />}
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
          {s.weightKg ? `${s.weightKg.toFixed(2)} kg` : 'Menunggu timbang'}
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
      header: 'Reward',
      align: 'right',
      render: (s) => {
        const pts = s.verifiedQuantity * POINTS_PER_ECOBRICK;
        return (
          <span className="font-mono text-xs font-semibold text-[#245C45] tabular-nums whitespace-nowrap">
            {pts > 0 ? `+${pts} pts` : '-'}
          </span>
        );
      },
    },
    {
      key: 'detail',
      header: 'Detail',
      align: 'right',
      render: (s) => (
        <button
          type="button"
          onClick={() => onOpenTraceDetail(s.submissionId)}
          className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#245C45] hover:bg-[#E7F0E8] transition-colors whitespace-nowrap"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span>Detail</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title={isPersonalPenyerah ? 'My Contributions' : 'Ecobrick Contributions'}
        description={
          isPersonalPenyerah
            ? 'Catat penyerahan ecobrick yang sudah Anda buat dan pantau riwayat verifikasi serta perolehan Green Points.'
            : 'Pencatatan penerimaan ecobrick jadi di titik serah Community Hub Pesantren Al-Amanah.'
        }
      />

      {/* Submission Form + Compact Drop-off Schedule */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 sm:p-6 space-y-5 lg:col-span-8">
          <SectionHeader
            title="Form Penyerahan Ecobrick"
            description="Ecobrick jadi yang diserahkan berstatus Pending hingga diverifikasi Admin."
          />

          {formError && (
            <div
              role="alert"
              className="rounded border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]"
            >
              {formError}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="flex items-start gap-2 rounded border border-[#C6DBC9] bg-[#E7F0E8] px-3.5 py-2.5 text-xs font-medium text-[#245C45]"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isPersonalPenyerah ? (
                <FormField id="contrib-actor-readonly" label="Kontributor">
                  <div
                    id="contrib-actor-readonly"
                    className="flex items-center justify-between gap-2 rounded border border-[#E3E8E4] bg-[#F7F9F7] px-3 py-2 text-[13px] text-[#252B28]"
                  >
                    <span className="truncate font-medium">
                      {activeContributor?.name ?? 'Kontributor'}
                    </span>
                    <RoleTag role={state.activeRole} />
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
                        {c.name} ({c.role})
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              <FormField id="dropoff-select" label="Lokasi Penyerahan (Drop-off)">
                <select
                  id="dropoff-select"
                  value={dropoffPointId}
                  onChange={(e) => setDropoffPointId(e.target.value)}
                  className={fieldInputClass}
                >
                  {state.dropoff_points.map((dp) => (
                    <option key={dp.id} value={dp.id}>
                      {dp.name}
                    </option>
                  ))}
                </select>
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
                <input
                  id="quantity-submitted"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={quantitySubmitted}
                  onChange={(e) => setQuantitySubmitted(e.target.value)}
                  className={fieldInputClass}
                />
              </FormField>

              <FormField
                id="weight-kg"
                label="Berat (kg · Opsional)"
                hint="Kosongkan jika ditimbang saat verifikasi"
              >
                <input
                  id="weight-kg"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Contoh: 2.74"
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            {/* Simulated IoT Scale Readout */}
            <div className="rounded border border-[#E3E8E4] bg-[#F7F9F7] p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#252B28]">
                  <Cpu className="h-3.5 w-3.5 text-[#245C45]" aria-hidden="true" />
                  <span>Future IoT Integration · Simulated IoT Data</span>
                </div>
                <SecondaryButton size="sm" onClick={handleSimulateScale}>
                  Baca Simulasi Timbangan
                </SecondaryButton>
              </div>
              <p className="text-[11px] text-[#6B756F]">
                Alur rencana perangkat keras: Load Cell → HX711 → ESP32 →
                Platform.
                {iotSimulatedWeightKg !== undefined && (
                  <span className="ml-1 font-mono font-medium text-[#245C45]">
                    Simulated IoT Data: {iotSimulatedWeightKg} kg
                  </span>
                )}
              </p>
            </div>

            {/* Photo Upload */}
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
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[#CFD8D2] bg-white px-3 py-1.5 text-xs font-medium text-[#252B28] hover:bg-[#F7F9F7]"
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
                  {photoLabel ?? 'Belum ada foto dilampirkan (JPG/PNG, maks 2 MB)'}
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
                  className="h-28 w-auto rounded border border-[#E3E8E4] object-cover"
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
                Status awal: <strong className="text-[#92400E]">Pending</strong>{' '}
                · +{POINTS_PER_ECOBRICK} pts/unit setelah terverifikasi
              </span>
              <PrimaryButton type="submit">
                <PackagePlus className="h-4 w-4" aria-hidden="true" />
                <span>Catat Penyerahan Ecobrick</span>
              </PrimaryButton>
            </div>
          </form>
        </section>

        {/* Drop-off Points Schedule */}
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-3 lg:col-span-4">
          <SectionHeader title="Titik Penyerahan (Drop-off)" />
          <div className="divide-y divide-[#EEF2EF] rounded border border-[#E3E8E4] bg-[#F7F9F7]">
            {state.dropoff_points.map((dp) => (
              <div key={dp.id} className="p-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#245C45]">
                    {dp.id}
                  </span>
                  <span className="text-[11px] text-[#6B756F]">
                    {dp.coordinator}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-[#252B28]">
                  {dp.name}
                </h3>
                <p className="text-[11px] text-[#6B756F]">{dp.area}</p>
                <p className="font-mono text-[11px] text-[#245C45]">
                  {dp.schedule}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Contribution History Table */}
      <section className="space-y-3">
        <SectionHeader
          title="Contribution History"
          description="Klik ID atau tombol Detail untuk melihat alur keterlacakan, verifikasi, poin reward, batch inventori, dan pemanfaatan."
        />
        <DataTable
          columns={submissionColumns}
          rows={submissionRows}
          rowKey={(s) => s.submissionId}
          emptyMessage="Belum ada catatan penyerahan ecobrick."
        />
      </section>
    </div>
  );
}
