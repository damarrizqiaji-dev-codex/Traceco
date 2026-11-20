import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-[#D8DFDA] bg-white px-6 py-8 text-center">
      <p className="text-sm font-medium text-[#17201C]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-[#54625B]">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
