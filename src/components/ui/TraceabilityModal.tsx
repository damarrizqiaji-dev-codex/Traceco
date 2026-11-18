import { useMemo } from 'react';
import type { TracecoState } from '../../types/traceco';
import {
  buildSubmissionTraceability,
  generateDeterministicQrMatrix,
} from '../../utils/tracecoLogic';
import { PrimaryButton } from './Button';
import { Modal } from './Modal';
import { StatusTag } from './StatusBadge';
import { Timeline } from './Timeline';
import { TracecoLogo } from './TracecoLogo';

interface TraceabilityModalProps {
  targetId: string | null;
  state: TracecoState;
  onClose: () => void;
}

export function TraceabilityModal({
  targetId,
  state,
  onClose,
}: TraceabilityModalProps) {
  const batch = useMemo(
    () =>
      state.ecobrick_batches.find(
        (b) => b.batchId === targetId || b.submissionId === targetId
      ) ?? null,
    [state.ecobrick_batches, targetId]
  );

  const submission = useMemo(() => {
    if (batch) {
      return (
        state.ecobrick_submissions.find(
          (s) => s.submissionId === batch.submissionId
        ) ?? null
      );
    }
    return (
      state.ecobrick_submissions.find((s) => s.submissionId === targetId) ??
      null
    );
  }, [state.ecobrick_submissions, batch, targetId]);

  const stages = useMemo(
    () => (targetId ? buildSubmissionTraceability(state, targetId) : []),
    [state, targetId]
  );

  const identityCode = batch?.batchId ?? submission?.submissionId ?? '';

  const qrMatrix = useMemo(
    () =>
      identityCode ? generateDeterministicQrMatrix(`TRACECO:${identityCode}`) : [],
    [identityCode]
  );

  if (!targetId || !submission) return null;

  const contributor = state.contributors.find(
    (c) => c.id === submission.contributorId
  );

  return (
    <Modal
      open={Boolean(targetId && submission)}
      onClose={onClose}
      titleId="traceability-modal-title"
      leadingIcon={<TracecoLogo size="md" className="mt-0.5" />}
      title={
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-base font-semibold text-[#252B28]">
            {submission.submissionId}
          </h2>
          {batch && (
            <span className="font-mono text-xs font-medium text-[#245C45]">
              · Batch {batch.batchId}
            </span>
          )}
          <StatusTag status={submission.status} />
        </div>
      }
      subtitle={`Penyerah: ${contributor?.name ?? '-'} (${contributor ? (contributor.unitOrAddress ? `${contributor.role} · ${contributor.unitOrAddress}` : contributor.role) : '-'}) · Diserahkan ${submission.quantitySubmitted} unit · Terverifikasi ${submission.verifiedQuantity} unit`}
      footer={
        <>
          <span className="text-xs text-[#6B756F]">
            Konsep Distributed Ledger (Future Development, Non-Crypto): titik
            audit Submission → Verification → Reward → Inventory → Distribution.
          </span>
          <PrimaryButton size="sm" onClick={onClose}>
            Tutup
          </PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[190px_1fr]">
        <div className="flex flex-col items-center rounded border border-[#E3E8E4] bg-[#F7F9F7] p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#6B756F]">
            Identitas QR Traceability
          </p>
          <svg
            viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
            className="h-32 w-32 rounded border border-[#E3E8E4] bg-white p-2"
            role="img"
            aria-label={`Kode QR keterlacakan ${identityCode}`}
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
                    fill="#252B28"
                  />
                ) : null
              )
            )}
          </svg>
          <p className="mt-2 font-mono text-xs font-medium text-[#252B28]">
            {identityCode}
          </p>
          <p className="mt-1.5 text-center text-[11px] leading-relaxed text-[#6B756F]">
            Penelusuran dari kontributor hingga pemanfaatan aktual.
          </p>
          {submission.photoDataUrl && (
            <div className="mt-3 w-full border-t border-[#E3E8E4] pt-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#6B756F]">
                Foto Ecobrick
              </p>
              <img
                src={submission.photoDataUrl}
                alt={submission.photoLabel ?? `Foto ${submission.submissionId}`}
                className="h-20 w-full rounded border border-[#E3E8E4] bg-white object-cover"
              />
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B756F]">
            Alur Keterlacakan TRACECO (6 Tahap)
          </h3>
          <Timeline stages={stages} />
        </div>
      </div>
    </Modal>
  );
}
