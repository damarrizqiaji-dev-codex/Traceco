import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  footer?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  footer,
}: PageHeaderProps) {
  return (
    <header className="border-b border-[#D8DFDA] pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-1.5">
          <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-[#111E19] sm:text-[26px] [text-wrap:balance]">
            {title}
          </h1>
          <p className="text-[13px] leading-relaxed text-[#54625B]">
            {description}
          </p>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </header>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  rightSlot,
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 ${className}`}
    >
      <div className="min-w-[220px] flex-1 space-y-0.5">
        <h2 className="font-display text-base font-semibold tracking-tight text-[#111E19]">
          {title}
        </h2>
        {description && (
          <p className="text-xs leading-relaxed text-[#54625B]">
            {description}
          </p>
        )}
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}
