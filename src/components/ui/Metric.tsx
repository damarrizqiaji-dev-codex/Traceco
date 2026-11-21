import { ArrowUpRight } from 'lucide-react';

export interface MetricItem {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'default' | 'primary' | 'teal' | 'amber' | 'muted' | 'obsidian';
  progressPercent?: number;
  onClick?: () => void;
}

export function Metric({
  label,
  value,
  hint,
  accent = 'default',
  progressPercent,
  onClick,
  className = '',
}: MetricItem & { className?: string }) {
  const isFocal = accent === 'obsidian';

  const valueColor =
    isFocal || accent === 'primary'
      ? 'text-[#1B5E43]'
      : accent === 'teal'
        ? 'text-[#2B5E6B]'
        : accent === 'amber'
          ? 'text-[#A15C17]'
          : accent === 'muted'
            ? 'text-[#58655E]'
            : 'text-[#141B17]';

  const barColor =
    accent === 'teal'
      ? 'bg-[#2B5E6B]'
      : accent === 'amber'
        ? 'bg-[#B46B1E]'
        : 'bg-[#1B5E43]';

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#58655E]">{label}</p>
        {onClick && (
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-[#78857E] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#1B5E43]"
            aria-hidden="true"
          />
        )}
      </div>

      <p
        className={`mt-1.5 font-display text-[22px] leading-tight font-semibold tracking-tight tabular-nums ${valueColor}`}
      >
        {value}
      </p>

      {progressPercent !== undefined && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[#EAEFEA]">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${barColor}`}
            style={{
              width: `${Math.max(0, Math.min(100, progressPercent))}%`,
            }}
          />
        </div>
      )}

      {hint && <p className="mt-1.5 text-[11px] text-[#58655E]">{hint}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group px-4 py-3.5 text-left transition-colors duration-150 sm:px-5 sm:py-4 ${
          isFocal
            ? 'bg-[#F8FAF9] hover:bg-[#EFF5F2]'
            : 'bg-white hover:bg-[#F8FAF9]'
        } ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`px-4 py-3.5 sm:px-5 sm:py-4 ${
        isFocal ? 'bg-[#F8FAF9]' : 'bg-white'
      } ${className}`}
    >
      {content}
    </div>
  );
}

export function MetricStrip({
  items,
  columns = 5,
}: {
  items: MetricItem[];
  columns?: 3 | 4 | 5;
}) {
  const gridCols =
    columns === 3
      ? 'sm:grid-cols-3'
      : columns === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-5';

  return (
    <div
      className={`grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[#D9E0DC] bg-[#D9E0DC] ${gridCols}`}
    >
      {items.map((item, idx) => (
        <Metric
          key={item.label}
          {...item}
          className={
            columns === 5 && idx === items.length - 1
              ? 'sm:col-span-2 lg:col-span-1'
              : ''
          }
        />
      ))}
    </div>
  );
}
