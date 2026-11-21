import type { ReactNode } from 'react';

export const fieldInputClass =
  'w-full rounded-md border border-[#C5CEC9] bg-white px-3 py-2 text-[13px] text-[#1B231F] placeholder:text-[#78857E] transition-[border-color,box-shadow] duration-150 focus:border-[#1B5E43] focus:ring-2 focus:ring-[#1B5E43]/15 focus:outline-none disabled:bg-[#ECF0ED] disabled:text-[#58655E]';

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
        className="mb-1.5 block text-xs font-medium text-[#1B231F]"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#58655E]">{hint}</p>}
    </div>
  );
}
