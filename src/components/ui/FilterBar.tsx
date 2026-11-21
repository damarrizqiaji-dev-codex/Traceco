interface FilterBarOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterBarProps<T extends string> {
  options: FilterBarOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function FilterBar<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = 'Filter daftar',
}: FilterBarProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap items-center gap-1 rounded-md border border-[#D9E0DC] bg-[#ECF0ED] p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-[background-color,color,box-shadow] duration-150 whitespace-nowrap shrink-0 ${
              active
                ? 'bg-white text-[#1B5E43] font-semibold shadow-2xs'
                : 'text-[#58655E] hover:bg-white/70 hover:text-[#141B17]'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  active ? 'text-[#1B5E43]' : 'text-[#58655E]'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
