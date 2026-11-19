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
      className="flex items-center gap-1 overflow-x-auto border-b border-[#E3E8E4] pb-px"
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
                ? 'border-[#245C45] font-semibold text-[#245C45]'
                : 'border-transparent font-medium text-[#6B756F] hover:border-[#CFD8D2] hover:text-[#252B28]'
            }`}
          >
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E7F0E8] text-[#245C45]'
                    : 'bg-[#F2F5F3] text-[#6B756F]'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
