import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: 'sm' | 'md';
}

export function PrimaryButton({
  children,
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const sizing =
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13px]';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded bg-[#245C45] font-medium text-white hover:bg-[#1B4735] disabled:cursor-not-allowed disabled:opacity-45 transition-colors whitespace-nowrap ${sizing} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const sizing =
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-[13px]';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded border border-[#CFD8D2] bg-white font-medium text-[#252B28] hover:bg-[#F7F9F7] disabled:cursor-not-allowed disabled:opacity-45 transition-colors whitespace-nowrap ${sizing} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const sizing =
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-[13px]';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded border border-[#E2B4B4] bg-white font-medium text-[#991B1B] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-45 transition-colors whitespace-nowrap ${sizing} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
