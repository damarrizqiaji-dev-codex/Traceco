import type { ReactNode } from 'react';

export const fieldInputClass =
  'w-full rounded-md border border-[#C6D1CA] bg-white px-3 py-2 text-[13px] text-[#17201C] placeholder:text-[#7E8C85] transition-[border-color,box-shadow] duration-150 focus:border-[#166549] focus:ring-2 focus:ring-[#166549]/15 focus:outline-none disabled:bg-[#F2F4F2] disabled:text-[#54625B]';

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  hint,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-[#17201C]"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#54625B]">{hint}</p>}
    </div>
  );
}
