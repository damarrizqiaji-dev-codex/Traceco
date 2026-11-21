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
      className={`inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1B5E43] font-medium text-white shadow-2xs hover:bg-[#144833] active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-[#ECF0ED] disabled:text-[#78857E] disabled:shadow-none disabled:active:scale-100 transition-[background-color,color,transform,box-shadow] duration-150 whitespace-nowrap shrink-0 ${sizing} ${className}`}
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-[#B5CEC0] bg-white font-medium text-[#1B5E43] hover:border-[#1B5E43] hover:bg-[#EFF5F2] active:scale-[0.985] disabled:cursor-not-allowed disabled:border-[#D9E0DC] disabled:bg-[#F5F6F5] disabled:text-[#78857E] disabled:active:scale-100 transition-[background-color,border-color,color,transform] duration-150 whitespace-nowrap shrink-0 ${sizing} ${className}`}
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-[#DFB8B8] bg-white font-medium text-[#A62626] hover:bg-[#FDF3F3] hover:border-[#A62626] active:scale-[0.985] disabled:cursor-not-allowed disabled:border-[#D9E0DC] disabled:bg-[#F5F6F5] disabled:text-[#78857E] disabled:active:scale-100 transition-[background-color,border-color,color,transform] duration-150 whitespace-nowrap shrink-0 ${sizing} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
