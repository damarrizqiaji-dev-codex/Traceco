import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-[#E3E8E4] bg-white px-6 py-8 text-center">
      <p className="text-sm font-medium text-[#252B28]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-[#6B756F]">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
