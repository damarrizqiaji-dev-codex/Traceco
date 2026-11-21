import { Eye } from 'lucide-react';
import type { ActivityFeedItem } from '../../types/traceco';

interface ActivityItemProps {
  item: ActivityFeedItem;
  onInspectBatch?: (batchId: string) => void;
}

export function ActivityItem({ item, onInspectBatch }: ActivityItemProps) {
  const timePart = item.timestamp.includes(' ')
    ? item.timestamp.split(' ')[1]
    : item.timestamp;

  const categoryColor =
    item.category === 'Verifikasi'
      ? 'text-[#1B5E43]'
      : item.category === 'Reward'
        ? 'text-[#A15C17]'
        : item.category === 'Komunitas'
          ? 'text-[#2B5E6B]'
          : 'text-[#58655E]';

  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0 transition-colors duration-150">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 w-12 shrink-0 font-mono text-xs text-[#58655E] tabular-nums">
          {timePart}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[13px] leading-snug text-[#1B231F]">
            <span className="font-medium">{item.title}</span>{' '}
            <span className={`text-[11px] font-medium whitespace-nowrap ${categoryColor}`}>
              · {item.category}
            </span>
          </p>
          <p className="text-xs leading-relaxed text-[#58655E]">{item.detail}</p>
        </div>
      </div>
      {item.batchId && onInspectBatch && (
        <button
          type="button"
          onClick={() => onInspectBatch(item.batchId!)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#B5CEC0] bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-[#1B5E43] hover:border-[#1B5E43] hover:bg-[#EFF5F2] active:scale-[0.98] transition-[background-color,border-color,transform] duration-150 whitespace-nowrap"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span>{item.batchId}</span>
        </button>
      )}
    </div>
  );
}
