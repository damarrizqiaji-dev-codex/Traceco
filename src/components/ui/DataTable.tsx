import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  className?: string;
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectedRowKey?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  selectedRowKey,
  onRowClick,
  emptyMessage = 'Belum ada data tercatat.',
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<{
    key: string;
    dir: 'asc' | 'desc';
  } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortState) return rows;
    const col = columns.find((c) => c.key === sortState.key);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), 'id');
      }
      return sortState.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, columns, sortState]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-[#D9E0DC] bg-white px-4 py-8 text-center text-xs text-[#58655E]">
        {emptyMessage}
      </div>
    );
  }

  const toggleSort = (colKey: string) => {
    setSortState((prev) => {
      if (!prev || prev.key !== colKey) return { key: colKey, dir: 'desc' };
      if (prev.dir === 'desc') return { key: colKey, dir: 'asc' };
      return null;
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#D9E0DC] bg-white">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#D9E0DC] bg-[#F8FAF9] text-xs font-medium text-[#34403A]">
            {columns.map((col) => {
              const isSorted = sortState?.key === col.key;
              return (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.className ?? ''}`}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-[#1B5E43] transition-colors duration-150 ${
                        isSorted ? 'font-semibold text-[#1B5E43]' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {isSorted && sortState.dir === 'asc' ? (
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      ) : isSorted && sortState.dir === 'desc' ? (
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowUpDown
                          className="h-3 w-3 opacity-45"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
            {onRowClick && <th className="w-7 px-2 py-2.5" aria-hidden="true" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EAEFEA]">
          {sortedRows.map((row) => {
            const key = rowKey(row);
            const isSelected = selectedRowKey === key;
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`group transition-colors duration-150 ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${
                  isSelected
                    ? 'bg-[#EFF5F2]'
                    : onRowClick
                      ? 'even:bg-[#F8FAF9]/65 hover:bg-[#EFF5F2]/65'
                      : 'even:bg-[#F8FAF9]/65 hover:bg-[#F8FAF9]'
                }`}
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
                {onRowClick && (
                  <td className="w-7 px-2 py-3 text-right align-middle">
                    <ChevronRight
                      className="h-3.5 w-3.5 text-[#78857E] opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-[#1B5E43]"
                      aria-hidden="true"
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
