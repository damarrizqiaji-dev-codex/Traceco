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
      className={`inline-flex items-center justify-center gap-1.5 rounded-md bg-[#166549] font-medium text-white shadow-2xs hover:bg-[#0F4C36] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 transition-[background-color,transform,box-shadow] duration-150 whitespace-nowrap shrink-0 ${sizing} ${className}`}
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
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13px]';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-[#C6D1CA] bg-white font-medium text-[#17201C] hover:border-[#166549]/45 hover:bg-[#F8FAF8] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 transition-[background-color,border-color,transform] duration-150 whitespace-nowrap shrink-0 ${sizing} ${className}`}
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
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13px]';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E5B8B8] bg-white font-medium text-[#B91C1C] hover:bg-[#FEF2F2] hover:border-[#B91C1C] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 transition-[background-color,border-color,transform] duration-150 whitespace-nowrap shrink-0 ${sizing} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
