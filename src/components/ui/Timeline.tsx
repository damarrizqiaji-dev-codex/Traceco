import type { TraceabilityStage } from '../../utils/tracecoLogic';

interface TimelineProps {
  stages: TraceabilityStage[];
}

export function Timeline({ stages }: TimelineProps) {
  return (
    <ol className="relative ml-2.5 space-y-0 border-l border-[#D9E0DC]">
      {stages.map((stage, idx) => {
        const markerStyles =
          stage.state === 'completed'
            ? 'border-[#1B5E43] bg-[#1B5E43] text-white'
            : stage.state === 'current'
              ? 'border-[#A15C17] bg-[#FBF6EE] text-[#A15C17]'
              : stage.state === 'rejected'
                ? 'border-[#A62626] bg-[#FDF3F3] text-[#A62626]'
                : 'border-[#C5CEC9] bg-white text-[#58655E]';

        const stateLabel =
          stage.state === 'completed'
            ? 'Selesai'
            : stage.state === 'current'
              ? 'Tahap Aktif'
              : stage.state === 'rejected'
                ? 'Ditolak'
                : 'Belum Dimulai';

        return (
          <li key={stage.key} className="relative pb-5 pl-6 last:pb-0">
            <span
              className={`absolute -left-[9px] top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded border font-mono text-[9px] font-semibold ${markerStyles}`}
              aria-hidden="true"
            >
              {idx + 1}
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#1B231F]">
                  {stage.label}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    stage.state === 'completed'
                      ? 'text-[#1B5E43]'
                      : stage.state === 'current'
                        ? 'text-[#A15C17]'
                        : stage.state === 'rejected'
                          ? 'text-[#A62626]'
                          : 'text-[#58655E]'
                  }`}
                >
                  · {stateLabel}
                </span>
              </div>
              {stage.timestamp && (
                <span className="font-mono text-[11px] text-[#58655E] tabular-nums">
                  {stage.timestamp}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#58655E]">
              {stage.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
