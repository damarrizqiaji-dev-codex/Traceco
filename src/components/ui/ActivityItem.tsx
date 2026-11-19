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

  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0 transition-colors duration-150">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 w-12 shrink-0 font-mono text-xs text-[#6B756F] tabular-nums">
          {timePart}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[13px] leading-snug text-[#252B28]">
            <span className="font-medium">{item.title}</span>{' '}
            <span className="text-[11px] text-[#6B756F] whitespace-nowrap">
              · {item.category}
            </span>
          </p>
          <p className="text-xs leading-relaxed text-[#6B756F]">{item.detail}</p>
        </div>
      </div>
      {item.batchId && onInspectBatch && (
        <button
          type="button"
          onClick={() => onInspectBatch(item.batchId!)}
          className="inline-flex shrink-0 items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-[#245C45] hover:border-[#245C45] hover:bg-[#E7F0E8] active:scale-[0.98] transition-[background-color,border-color,transform] duration-150 whitespace-nowrap"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span>{item.batchId}</span>
        </button>
      )}
    </div>
  );
}
