import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/utils/cn';
import type { DiffRow, DiffCell, RowStatus, ColumnMapping } from '@/types';

interface DiffTableProps {
  filterStatus: RowStatus;
}

export function DiffTable({ filterStatus }: DiffTableProps) {
  const { diffResult } = useAppStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(() => {
    if (!diffResult) return [];
    return diffResult.rows.filter(row => row.status === filterStatus);
  }, [diffResult, filterStatus]);

  const mappings = diffResult?.columnMappings || [];

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 15,
  });

  if (!diffResult) return null;

  if (filteredRows.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-[var(--color-border)] rounded-xl">
        <p className="text-sm text-[var(--color-muted-foreground)]">No rows to display in this category.</p>
      </div>
    );
  }

  // For "modified" rows, show side-by-side (value A | value B) for each mapped column
  const showSideBySide = filterStatus === 'modified';

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="overflow-x-auto bg-slate-100 border-b border-[var(--color-border)]">
        <div className="flex text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide min-w-max">
          <div className="flex-shrink-0 w-[60px] px-2 py-2.5 text-center border-r border-[var(--color-border)]">
            Status
          </div>
          <div className="flex-shrink-0 w-[50px] px-2 py-2.5 text-center border-r border-[var(--color-border)]">
            #A
          </div>
          <div className="flex-shrink-0 w-[50px] px-2 py-2.5 text-center border-r border-[var(--color-border)]">
            #B
          </div>
          {mappings.map((mapping, idx) => (
            showSideBySide ? (
              <div key={idx} className="flex-shrink-0 border-r border-[var(--color-border)]" style={{ width: 280 }}>
                <div className="px-2 py-1 text-center border-b border-[var(--color-border)] text-xs font-bold">
                  {mapping.headerA || mapping.headerB || `Col ${idx}`}
                </div>
                <div className="flex">
                  <div className="flex-1 px-2 py-1 text-center border-r border-[var(--color-border)] bg-red-50/50">
                    Original (A)
                  </div>
                  <div className="flex-1 px-2 py-1 text-center bg-green-50/50">
                    Modified (B)
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={idx}
                className="flex-shrink-0 w-[160px] px-2 py-2.5 border-r border-[var(--color-border)] truncate"
              >
                {mapping.headerA || mapping.headerB || `Col ${idx}`}
              </div>
            )
          ))}
        </div>
      </div>

      {/* Virtualized Rows */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(filteredRows.length * 40 + 2, 550) }}
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
                  'absolute top-0 left-0 w-full flex items-stretch text-xs border-b border-[var(--color-border)] min-w-max',
                  getRowBgColor(row.status)
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Status */}
                <div className="flex-shrink-0 w-[60px] px-2 flex items-center justify-center border-r border-[var(--color-border)]">
                  <StatusBadge status={row.status} />
                </div>
                {/* Line A */}
                <div className="flex-shrink-0 w-[50px] px-2 flex items-center justify-center border-r border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                  {row.lineNumberA || '-'}
                </div>
                {/* Line B */}
                <div className="flex-shrink-0 w-[50px] px-2 flex items-center justify-center border-r border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                  {row.lineNumberB || '-'}
                </div>
                {/* Cells */}
                {row.cells.map((cell, i) => (
                  showSideBySide ? (
                    <SideBySideCell key={i} cell={cell} />
                  ) : (
                    <SingleCell key={i} cell={cell} rowStatus={row.status} />
                  )
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-slate-50 border-t border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
        Showing {filteredRows.length.toLocaleString()} rows
      </div>
    </div>
  );
}

/**
 * Side-by-side cell for "modified" tab — shows value A and value B next to each other.
 */
function SideBySideCell({ cell }: { cell: DiffCell }) {
  const isChanged = cell.status === 'changed';

  return (
    <div
      className={cn(
        'flex-shrink-0 flex items-stretch border-r border-[var(--color-border)]',
        isChanged && 'bg-amber-50/40'
      )}
      style={{ width: 280 }}
    >
      {/* Value A */}
      <div
        className={cn(
          'flex-1 px-2 flex items-center border-r border-[var(--color-border)] truncate',
          isChanged ? 'bg-red-50 text-red-800' : ''
        )}
      >
        <span className="truncate">{cell.valueA ?? ''}</span>
      </div>
      {/* Value B */}
      <div
        className={cn(
          'flex-1 px-2 flex items-center truncate',
          isChanged ? 'bg-green-50 text-green-800' : ''
        )}
      >
        <span className="truncate">{cell.valueB ?? ''}</span>
      </div>
    </div>
  );
}

/**
 * Single cell display for non-modified tabs (added, removed, matched).
 */
function SingleCell({ cell, rowStatus }: { cell: DiffCell; rowStatus: RowStatus }) {
  // For "added" rows show valueB, for "removed" show valueA, for "matched" show valueA
  const displayValue = rowStatus === 'added'
    ? (cell.valueB ?? '')
    : (cell.valueA ?? '');

  return (
    <div className="flex-shrink-0 w-[160px] px-2 flex items-center border-r border-[var(--color-border)] truncate">
      <span className="truncate">{displayValue}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  const config = {
    added: { label: 'ADD', className: 'bg-green-100 text-green-700' },
    removed: { label: 'DEL', className: 'bg-red-100 text-red-700' },
    modified: { label: 'MOD', className: 'bg-amber-100 text-amber-700' },
    unchanged: { label: 'OK', className: 'bg-slate-100 text-slate-500' },
    moved: { label: 'MOV', className: 'bg-blue-100 text-blue-700' },
  };

  const { label, className } = config[status];

  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', className)}>
      {label}
    </span>
  );
}

function getRowBgColor(status: RowStatus): string {
  switch (status) {
    case 'added': return 'bg-green-50/30';
    case 'removed': return 'bg-red-50/30';
    case 'modified': return '';
    case 'moved': return 'bg-blue-50/30';
    default: return '';
  }
}
