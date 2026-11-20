import { ArrowLeft, QrCode } from 'lucide-react';
import type { TracecoState } from '../types/traceco';
import {
  POINTS_PER_ECOBRICK,
  buildSubmissionTraceability,
  computeVerifiedInventory,
  generateDeterministicQrMatrix,
  isPenyerahRole,
} from '../utils/tracecoLogic';
import { SecondaryButton } from '../components/ui/Button';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';
import { Timeline } from '../components/ui/Timeline';

interface TraceabilityPageProps {
  state: TracecoState;
  selectedTargetId: string | null;
  onSelectTarget: (targetId: string) => void;
  onBack?: () => void;
  embedded?: boolean;
}

export function TraceabilityPage({
  state,
  selectedTargetId,
  onSelectTarget,
  onBack,
  embedded = false,
}: TraceabilityPageProps) {
  const actorId = state.currentUserId ?? '';
  const isPersonal = isPenyerahRole(state.activeRole);

  const visibleSubmissions = isPersonal
    ? state.ecobrick_submissions.filter((s) => s.contributorId === actorId)
    : state.ecobrick_submissions;

  const resolvedSubmission =
    state.ecobrick_submissions.find(
      (s) => s.submissionId === selectedTargetId
    ) ??
    (() => {
      const batchMatch = state.ecobrick_batches.find(
        (b) => b.batchId === selectedTargetId
      );
      return batchMatch
        ? state.ecobrick_submissions.find(
            (s) => s.submissionId === batchMatch.submissionId
          )
        : undefined;
    })() ??
    visibleSubmissions[0] ??
    state.ecobrick_submissions[0];

  if (!resolvedSubmission) {
    return (
      <div className="space-y-6">
        {!embedded && (
          <PageHeader
            title="Traceability & Detail Kontribusi"
            description="Riwayat keterlacakan ecobrick dari penyerahan hingga pemanfaatan aktual."
          />
        )}
        <div className="rounded-lg border border-[#D8DFDA] bg-white p-8 text-center text-xs text-[#54625B]">
          Belum ada catatan kontribusi ecobrick untuk dilacak.
        </div>
      </div>
    );
  }

  const batch = state.ecobrick_batches.find(
    (b) => b.submissionId === resolvedSubmission.submissionId
  );
  const contributor = state.contributors.find(
    (c) => c.id === resolvedSubmission.contributorId
  );
  const verification = state.verification_records.find(
    (v) => v.submissionId === resolvedSubmission.submissionId
  );
  const rewardEntry = state.green_points.find(
    (g) =>
      g.submissionId === resolvedSubmission.submissionId && g.type === 'Earned'
  );
  const inventoryItems = computeVerifiedInventory(
    state.ecobrick_batches,
    state.distribution_requests,
    state.contributors
  );
  const batchInv = batch
    ? inventoryItems.find((i) => i.batchId === batch.batchId)
    : undefined;
  const relatedRequests = batch
    ? state.distribution_requests.filter((d) => d.batchId === batch.batchId)
    : [];

  const stages = buildSubmissionTraceability(
    state,
    resolvedSubmission.submissionId
  );
  const identityCode = batch?.batchId ?? resolvedSubmission.submissionId;
  const qrMatrix = generateDeterministicQrMatrix(`TRACECO:${identityCode}`);

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D8DFDA] bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {onBack && (
              <SecondaryButton size="sm" onClick={onBack}>
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Riwayat</span>
              </SecondaryButton>
            )}
            <span className="font-mono text-xs font-semibold text-[#166549]">
              {resolvedSubmission.submissionId}
            </span>
            <StatusTag status={resolvedSubmission.status} />
          </div>
          <select
            aria-label="Pilih ID Kontribusi"
            value={resolvedSubmission.submissionId}
            onChange={(e) => onSelectTarget(e.target.value)}
            className="rounded-md border border-[#C6D1CA] bg-white px-3 py-1.5 font-mono text-xs font-medium text-[#17201C] focus:border-[#166549] focus:outline-none"
          >
            {visibleSubmissions.map((s) => (
              <option key={s.submissionId} value={s.submissionId}>
                {s.submissionId} · {s.date} ({s.status})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <PageHeader
          title={`Detail Kontribusi · ${resolvedSubmission.submissionId}`}
          description="Penelusuran lengkap dari penyerahan ecobrick hingga inventori dan pemanfaatan akhir."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {onBack && (
                <SecondaryButton size="sm" onClick={onBack}>
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Kembali</span>
                </SecondaryButton>
              )}
              <select
                aria-label="Pilih ID Kontribusi"
                value={resolvedSubmission.submissionId}
                onChange={(e) => onSelectTarget(e.target.value)}
                className="rounded-md border border-[#C6D1CA] bg-white px-3 py-1.5 font-mono text-xs font-medium text-[#17201C] focus:border-[#166549] focus:outline-none"
              >
                {visibleSubmissions.map((s) => (
                  <option key={s.submissionId} value={s.submissionId}>
                    {s.submissionId} · {s.date} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          }
        />
      )}

      {/* Connected 5-Stage Lifecycle Summary */}
      <section className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[#D8DFDA] bg-[#D8DFDA] sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1 bg-white p-4">
          <p className="text-xs font-medium text-[#54625B]">1. Kontribusi</p>
          <p className="font-display text-base font-semibold text-[#17201C] tabular-nums">
            {resolvedSubmission.quantitySubmitted} Ecobrick
          </p>
          <p className="text-xs text-[#54625B]">
            {resolvedSubmission.weightKg
              ? `${resolvedSubmission.weightKg.toFixed(2)} kg · `
              : ''}
            {resolvedSubmission.date}
          </p>
        </div>

        <div className="space-y-1.5 bg-white p-4">
          <p className="text-xs font-medium text-[#54625B]">2. Verifikasi</p>
          <div>
            <StatusTag status={resolvedSubmission.status} />
          </div>
          <p className="text-xs text-[#54625B]">
            {verification
              ? `${verification.verifiedCount} lolos · ${verification.verifierName}`
              : 'Menunggu inspeksi pos'}
          </p>
        </div>

        <div className="space-y-1 bg-white p-4">
          <p className="text-xs font-medium text-[#54625B]">3. Reward</p>
          <p className="font-display text-base font-semibold text-[#166549] tabular-nums">
            {rewardEntry
              ? `+${rewardEntry.points} GP`
              : resolvedSubmission.verifiedQuantity > 0
                ? `+${resolvedSubmission.verifiedQuantity * POINTS_PER_ECOBRICK} GP`
                : '0 GP'}
          </p>
          <p className="text-xs text-[#54625B]">
            +{POINTS_PER_ECOBRICK} GP / unit terverifikasi
          </p>
        </div>

        <div className="space-y-1 bg-white p-4">
          <p className="text-xs font-medium text-[#54625B]">4. Inventori</p>
          <p className="font-mono text-sm font-semibold text-[#1D6373]">
            {batch ? `Batch ${batch.batchId}` : 'Belum ada batch'}
          </p>
          <p className="text-xs text-[#54625B]">
            {batchInv
              ? `${batchInv.availableCount} tersedia · ${batchInv.totalVerifiedCount} terverifikasi`
              : 'Menunggu verifikasi'}
          </p>
        </div>

        <div className="space-y-1.5 bg-white p-4">
          <p className="text-xs font-medium text-[#54625B]">5. Pemanfaatan</p>
          <div>
            <StatusTag
              status={
                batchInv
                  ? batchInv.inventoryStatus
                  : resolvedSubmission.status === 'Rejected'
                    ? 'Rejected'
                    : 'Pending'
              }
            />
          </div>
          <p className="text-xs text-[#54625B]">
            {relatedRequests.length > 0
              ? `${relatedRequests[0].utilizationCategory} (${relatedRequests[0].status})`
              : batchInv
                ? 'Tersedia untuk diajukan mitra'
                : 'Belum masuk inventori'}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left: Obsidian QR Identity Block + Submission Specs */}
        <section className="space-y-5 lg:col-span-4">
          <div className="overflow-hidden rounded-lg border border-[#D8DFDA] bg-white">
            {/* Obsidian QR Identity Card */}
            <div className="border-b border-[#243A31] bg-[#111E19] p-5 text-[#ECF2EE] space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-[#243A31] pb-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-[#6EE7B7]">
                    {identityCode}
                  </p>
                  <p className="text-xs text-[#C8D8D0]">
                    {contributor?.name ?? '-'}
                  </p>
                </div>
                {contributor && (
                  <span className="font-mono text-[11px] font-medium text-[#9EB5AA]">
                    {contributor.segment ?? contributor.role}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-[#9EB5AA]">
                  <QrCode className="h-3.5 w-3.5 text-[#6EE7B7]" aria-hidden="true" />
                  <span>QR Identitas Batch / Kontribusi</span>
                </div>
                <div className="rounded-md bg-white p-2.5">
                  <svg
                    viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                    className="h-32 w-32"
                    role="img"
                    aria-label={`Kode QR ${identityCode}`}
                  >
                    {qrMatrix.map((row, rIdx) =>
                      row.map((filled, cIdx) =>
                        filled ? (
                          <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx}
                            y={rIdx}
                            width={1}
                            height={1}
                            fill="#111E19"
                          />
                        ) : null
                      )
                    )}
                  </svg>
                </div>
                <p className="mt-2.5 font-mono text-xs font-medium text-[#ECF2EE]">
                  TRACECO:{identityCode}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="space-y-2 text-xs">
                {contributor && (
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <span className="text-[#54625B]">Peran Penyerah</span>
                    <RoleTag
                      role={contributor.role}
                      segment={contributor.segment}
                      variant="inline"
                    />
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-[#54625B]">Pos Penyerahan</span>
                  <span className="text-right font-medium text-[#17201C]">
                    {resolvedSubmission.dropoffPointName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#54625B]">Ukuran Botol</span>
                  <span className="text-right text-[#17201C]">
                    {resolvedSubmission.bottleSize}
                  </span>
                </div>
                {resolvedSubmission.iotSimulatedWeightKg !== undefined && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[#54625B]">Timbangan Pos</span>
                    <span className="font-mono font-medium text-[#1D6373] tabular-nums">
                      {resolvedSubmission.iotSimulatedWeightKg} kg
                    </span>
                  </div>
                )}
                {resolvedSubmission.notes && (
                  <div className="border-t border-[#EAEFEA] pt-2.5">
                    <span className="text-[#54625B]">Catatan: </span>
                    <span className="text-[#17201C]">
                      {resolvedSubmission.notes}
                    </span>
                  </div>
                )}
              </div>

              {resolvedSubmission.photoDataUrl && (
                <div className="space-y-1.5 border-t border-[#EAEFEA] pt-3">
                  <p className="text-xs font-medium text-[#54625B]">
                    Foto Dokumentasi
                  </p>
                  <img
                    src={resolvedSubmission.photoDataUrl}
                    alt={`Dokumentasi ${resolvedSubmission.submissionId}`}
                    referrerPolicy="no-referrer"
                    className="w-full rounded-md border border-[#D8DFDA] object-cover"
                  />
                </div>
              )}

              {verification?.rejectionReason && (
                <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
                  <p className="font-semibold">Alasan Penolakan:</p>
                  <p className="mt-0.5">{verification.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right: 6-Stage Traceability Timeline */}
        <section className="space-y-4 rounded-lg border border-[#D8DFDA] bg-white p-5 sm:p-6 lg:col-span-8">
          <SectionHeader
            title="Timeline Keterlacakan Kontribusi"
            description="Jejak proses Penyerahan → Verifikasi → Reward → Inventori → Distribusi → Pemanfaatan."
          />
          <Timeline stages={stages} />
          <div className="border-t border-[#EAEFEA] pt-3 text-[11px] text-[#54625B]">
            Audit Keterlacakan Non-Kripto: struktur riwayat kontribusi
            berurutan untuk akuntabilitas sosial ekosistem tanpa dompet kripto.
          </div>
        </section>
      </div>
    </div>
  );
}
