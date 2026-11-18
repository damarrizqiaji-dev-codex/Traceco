import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectedRowKey?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  selectedRowKey,
  emptyMessage = 'Belum ada data tercatat.',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-[#E3E8E4] bg-white px-4 py-8 text-center text-xs text-[#6B756F]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[#E3E8E4] bg-white">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#E3E8E4] bg-[#F7F9F7] text-[11px] font-semibold uppercase tracking-wider text-[#6B756F]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                } ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF2EF]">
          {rows.map((row) => {
            const key = rowKey(row);
            const isSelected = selectedRowKey === key;
            return (
              <tr
                key={key}
                className={
                  isSelected
                    ? 'bg-[#E7F0E8]/45'
                    : 'hover:bg-[#FAFBF9] transition-colors'
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 align-middle ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.className ?? ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
