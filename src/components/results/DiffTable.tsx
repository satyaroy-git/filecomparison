import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/utils/cn';
import type { DiffRow, DiffCell, CharDiff } from '@/types';

export function DiffTable() {
  const { diffResult, uiState } = useAppStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(() => {
    if (!diffResult) return [];
    let rows = diffResult.rows;

    if (uiState.diffFilter !== 'all') {
      rows = rows.filter(row => row.status === uiState.diffFilter);
    }

    if (!uiState.showUnchangedRows && uiState.diffFilter === 'all') {
      rows = rows.filter(row => row.status !== 'unchanged');
    }

    return rows;
  }, [diffResult, uiState.diffFilter, uiState.showUnchangedRows]);

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  if (!diffResult) return null;

  const headers = diffResult.headersA.length >= diffResult.headersB.length
    ? diffResult.headersA
    : diffResult.headersB;

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex bg-slate-100 border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-muted-foreground)] overflow-x-auto">
        <div className="flex-shrink-0 w-16 px-2 py-2.5 text-center border-r border-[var(--color-border)]">Status</div>
        <div className="flex-shrink-0 w-12 px-2 py-2.5 text-center border-r border-[var(--color-border)]">#A</div>
        <div className="flex-shrink-0 w-12 px-2 py-2.5 text-center border-r border-[var(--color-border)]">#B</div>
        {headers.map((header, i) => (
          <div key={i} className="flex-shrink-0 w-40 px-2 py-2.5 border-r border-[var(--color-border)] truncate">
            {header}
          </div>
        ))}
      </div>

      {/* Virtualized rows */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(filteredRows.length * 36, 600) }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = filteredRows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className={cn(
                  'absolute top-0 left-0 w-full flex items-stretch text-xs border-b border-[var(--color-border)]',
                  getRowBgColor(row.status)
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Status */}
                <div className="flex-shrink-0 w-16 px-2 flex items-center justify-center border-r border-[var(--color-border)]">
                  <StatusBadge status={row.status} />
                </div>
                {/* Line A */}
                <div className="flex-shrink-0 w-12 px-2 flex items-center justify-center border-r border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                  {row.lineNumberA || '-'}
                </div>
                {/* Line B */}
                <div className="flex-shrink-0 w-12 px-2 flex items-center justify-center border-r border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                  {row.lineNumberB || '-'}
                </div>
                {/* Cells */}
                {row.cells.map((cell, i) => (
                  <CellView key={i} cell={cell} showCharDiffs={uiState.highlightCharDiffs} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-slate-50 border-t border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
        Showing {filteredRows.length.toLocaleString()} of {diffResult.rows.length.toLocaleString()} rows
      </div>
    </div>
  );
}

function CellView({ cell, showCharDiffs }: { cell: DiffCell; showCharDiffs: boolean }) {
  if (cell.status === 'same') {
    return (
      <div className="flex-shrink-0 w-40 px-2 flex items-center border-r border-[var(--color-border)] truncate">
        <span className="truncate">{cell.valueA || ''}</span>
      </div>
    );
  }

  if (cell.status === 'added') {
    return (
      <div className="flex-shrink-0 w-40 px-2 flex items-center border-r border-[var(--color-border)] bg-green-50 truncate">
        <span className="truncate text-green-800">{cell.valueB || ''}</span>
      </div>
    );
  }

  if (cell.status === 'removed') {
    return (
      <div className="flex-shrink-0 w-40 px-2 flex items-center border-r border-[var(--color-border)] bg-red-50 truncate">
        <span className="truncate text-red-800 line-through">{cell.valueA || ''}</span>
      </div>
    );
  }

  // Changed cell
  if (showCharDiffs && cell.charDiffs) {
    return (
      <div className="flex-shrink-0 w-40 px-2 flex items-center border-r border-[var(--color-border)] bg-amber-50 overflow-hidden">
        <span className="truncate">
          {cell.charDiffs.map((diff, i) => (
            <span
              key={i}
              className={cn({
                'bg-red-200 line-through': diff.type === 'removed',
                'bg-green-200': diff.type === 'added',
                '': diff.type === 'same',
              })}
            >
              {diff.value}
            </span>
          ))}
        </span>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-40 px-2 flex items-center border-r border-[var(--color-border)] bg-amber-50 truncate">
      <span className="truncate">
        <span className="text-red-600 line-through">{cell.valueA}</span>
        <span className="text-green-700 ml-1">{cell.valueB}</span>
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: DiffRow['status'] }) {
  const config = {
    added: { label: 'ADD', className: 'bg-green-100 text-green-700' },
    removed: { label: 'DEL', className: 'bg-red-100 text-red-700' },
    modified: { label: 'MOD', className: 'bg-amber-100 text-amber-700' },
    unchanged: { label: '---', className: 'bg-slate-100 text-slate-500' },
    moved: { label: 'MOV', className: 'bg-blue-100 text-blue-700' },
  };

  const { label, className } = config[status];

  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', className)}>
      {label}
    </span>
  );
}

function getRowBgColor(status: DiffRow['status']): string {
  switch (status) {
    case 'added': return 'bg-green-50/50';
    case 'removed': return 'bg-red-50/50';
    case 'modified': return 'bg-amber-50/30';
    case 'moved': return 'bg-blue-50/50';
    default: return '';
  }
}
