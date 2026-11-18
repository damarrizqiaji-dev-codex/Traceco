import type { TraceabilityStage } from '../../utils/tracecoLogic';

interface TimelineProps {
  stages: TraceabilityStage[];
}

export function Timeline({ stages }: TimelineProps) {
  return (
    <ol className="relative space-y-0 border-l border-[#DCE4DE] ml-2">
      {stages.map((stage, idx) => {
        const dotStyles =
          stage.state === 'completed'
            ? 'border-[#245C45] bg-[#245C45]'
            : stage.state === 'current'
              ? 'border-[#B45309] bg-[#FEF3C7]'
              : stage.state === 'rejected'
                ? 'border-[#B91C1C] bg-[#FEE2E2]'
                : 'border-[#CFD8D2] bg-white';

        const stateLabel =
          stage.state === 'completed'
            ? 'Selesai'
            : stage.state === 'current'
              ? 'Tahap Aktif'
              : stage.state === 'rejected'
                ? 'Ditolak'
                : 'Belum Dimulai';

        return (
          <li key={stage.key} className="relative pl-5 pb-4 last:pb-0">
            <span
              className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 ${dotStyles}`}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-[#252B28]">
                  {idx + 1}. {stage.label}
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    stage.state === 'completed'
                      ? 'text-[#245C45]'
                      : stage.state === 'current'
                        ? 'text-[#92400E]'
                        : stage.state === 'rejected'
                          ? 'text-[#991B1B]'
                          : 'text-[#6B756F]'
                  }`}
                >
                  {stateLabel}
                </span>
              </div>
              {stage.timestamp && (
                <span className="font-mono text-[11px] text-[#6B756F] tabular-nums">
                  {stage.timestamp}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-[#6B756F]">
              {stage.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
