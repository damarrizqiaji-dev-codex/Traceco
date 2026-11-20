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
      className="inline-flex flex-wrap items-center gap-1 rounded-md border border-[#D8DFDA] bg-[#F2F4F2] p-1"
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
                ? 'bg-[#111E19] text-white shadow-2xs'
                : 'text-[#54625B] hover:bg-white/75 hover:text-[#17201C]'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  active ? 'text-[#A7D7C2]' : 'text-[#6B7972]'
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
