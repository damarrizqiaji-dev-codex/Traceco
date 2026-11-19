export interface MetricItem {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'default' | 'primary' | 'muted';
  onClick?: () => void;
}

export function Metric({
  label,
  value,
  hint,
  accent = 'default',
  onClick,
  className = '',
}: MetricItem & { className?: string }) {
  const valueColor =
    accent === 'primary'
      ? 'text-[#245C45]'
      : accent === 'muted'
        ? 'text-[#6B756F]'
        : 'text-[#252B28]';

  const content = (
    <>
      <p className="text-xs font-medium text-[#6B756F]">{label}</p>
      <p
        className={`mt-1 font-display text-[22px] leading-tight font-semibold tracking-tight tabular-nums ${valueColor}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-[#6B756F]">{hint}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`bg-white px-4 py-3.5 text-left hover:bg-[#FAFBF9] transition-colors duration-150 sm:px-5 sm:py-4 ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`bg-white px-4 py-3.5 sm:px-5 sm:py-4 ${className}`}>
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
      className={`grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E3E8E4] bg-[#E3E8E4] ${gridCols}`}
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
