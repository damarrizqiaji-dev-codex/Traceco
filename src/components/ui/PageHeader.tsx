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
    <header className="border-b border-[#E3E8E4] pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-[#252B28] sm:text-2xl">
            {title}
          </h1>
          <p className="text-[13px] leading-relaxed text-[#6B756F]">
            {description}
          </p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
        <h2 className="text-[15px] font-semibold text-[#252B28]">{title}</h2>
        {description && (
          <p className="text-xs text-[#6B756F]">{description}</p>
        )}
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}
