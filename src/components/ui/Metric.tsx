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
  const isObsidian = accent === 'obsidian';

  const valueColor = isObsidian
    ? 'text-white'
    : accent === 'primary'
      ? 'text-[#166549]'
      : accent === 'teal'
        ? 'text-[#1D6373]'
        : accent === 'amber'
          ? 'text-[#B45309]'
          : accent === 'muted'
            ? 'text-[#54625B]'
            : 'text-[#17201C]';

  const barColor = isObsidian
    ? 'bg-[#34D399]'
    : accent === 'teal'
      ? 'bg-[#1D6373]'
      : accent === 'amber'
        ? 'bg-[#D97706]'
        : 'bg-[#166549]';

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p
          className={`text-xs font-medium ${
            isObsidian ? 'text-[#9EB5AA]' : 'text-[#54625B]'
          }`}
        >
          {label}
        </p>
        {onClick && (
          <ArrowUpRight
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
              isObsidian
                ? 'text-[#9EB5AA] group-hover:text-white'
                : 'text-[#84928B] group-hover:text-[#166549]'
            }`}
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
        <div
          className={`mt-2.5 h-1 w-full overflow-hidden rounded-full ${
            isObsidian ? 'bg-[#243A31]' : 'bg-[#E6ECE8]'
          }`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${barColor}`}
            style={{
              width: `${Math.max(0, Math.min(100, progressPercent))}%`,
            }}
          />
        </div>
      )}

      {hint && (
        <p
          className={`mt-1.5 text-[11px] ${
            isObsidian ? 'text-[#89A296]' : 'text-[#54625B]'
          }`}
        >
          {hint}
        </p>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group px-4 py-3.5 text-left transition-colors duration-150 sm:px-5 sm:py-4 ${
          isObsidian
            ? 'bg-[#111E19] hover:bg-[#162720]'
            : 'bg-white hover:bg-[#F8FAF8]'
        } ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`px-4 py-3.5 sm:px-5 sm:py-4 ${
        isObsidian ? 'bg-[#111E19]' : 'bg-white'
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
      className={`grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[#D8DFDA] bg-[#D8DFDA] ${gridCols}`}
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
