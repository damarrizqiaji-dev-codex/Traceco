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
      className="inline-flex flex-wrap items-center gap-0.5 rounded border border-[#E3E8E4] bg-[#F7F9F7] p-0.5"
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
            className={`inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium transition-[background-color,color,border-color] duration-150 whitespace-nowrap ${
              active
                ? 'bg-white text-[#245C45] shadow-2xs border border-[#DCE4DE]'
                : 'text-[#6B756F] hover:text-[#252B28] border border-transparent'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  active ? 'text-[#245C45]' : 'text-[#6B756F]'
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
