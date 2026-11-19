import type { ReactNode } from 'react';

export const fieldInputClass =
  'w-full rounded border border-[#CFD8D2] bg-white px-3 py-2 text-[13px] text-[#252B28] placeholder:text-[#8A948E] transition-[border-color,box-shadow] duration-150 focus:border-[#245C45] focus:ring-2 focus:ring-[#245C45]/12 focus:outline-none disabled:bg-[#F7F9F7] disabled:text-[#6B756F]';

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
        className="mb-1.5 block text-xs font-medium text-[#252B28]"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#6B756F]">{hint}</p>}
    </div>
  );
}
