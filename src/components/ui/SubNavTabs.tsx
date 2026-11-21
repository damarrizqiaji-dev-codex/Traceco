export interface SubNavTabItem {
  id: string;
  label: string;
  badge?: number | string;
}

interface SubNavTabsProps {
  items: SubNavTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

export function SubNavTabs({
  items,
  activeId,
  onChange,
  ariaLabel = 'Submenu halaman',
}: SubNavTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-1 overflow-x-auto border-b border-[#D9E0DC] pb-px"
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] transition-[color,border-color] duration-150 whitespace-nowrap ${
              isActive
                ? 'border-[#1B5E43] font-semibold text-[#1B5E43]'
                : 'border-transparent font-medium text-[#58655E] hover:border-[#C5CEC9] hover:text-[#141B17]'
            }`}
          >
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`font-mono text-[11px] font-semibold tabular-nums ${
                  isActive ? 'text-[#1B5E43]' : 'text-[#58655E]'
                }`}
              >
                ({item.badge})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
