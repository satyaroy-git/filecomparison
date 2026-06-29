import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/utils/cn';
import type { DiffRow, DiffCell, RowStatus } from '@/types';

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

  // For "modified" (differences), show side-by-side Original vs Modified for each column
  const showSideBySide = filterStatus === 'modified';

  // Determine description text
  const descriptions: Record<string, string> = {
    modified: 'Rows where key matched but column values differ. Showing Original (A) vs Modified (B) side by side.',
    removed: 'Rows that exist only in the Original file (not found in Modified file by key).',
    added: 'Rows that exist only in the Modified file (not found in Original file by key).',
    unchanged: 'Rows that matched by key and have identical values across all columns.',
  };

  return (
    <div className="space-y-3">
      {/* Description */}
      <p className="text-xs text-[var(--color-muted-foreground)] italic">
        {descriptions[filterStatus] || ''}
      </p>

      <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="overflow-x-auto bg-slate-100 border-b border-[var(--color-border)]">
          <div className="flex text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide min-w-max">
            {/* Fixed columns */}
            <div className="flex-shrink-0 w-[50px] px-2 py-2.5 text-center border-r border-[var(--color-border)]">
              #A
            </div>
            <div className="flex-shrink-0 w-[50px] px-2 py-2.5 text-center border-r border-[var(--color-border)]">
              #B
            </div>
            {/* Data columns */}
            {mappings.map((mapping, idx) => {
              const colName = mapping.headerA || mapping.headerB || `Col ${idx}`;
              if (showSideBySide) {
                return (
                  <div key={idx} className="flex-shrink-0 border-r border-[var(--color-border)]" style={{ width: 300 }}>
                    <div className="px-2 py-1.5 text-center border-b border-[var(--color-border)] text-xs font-bold text-[var(--color-foreground)]">
                      {colName}
                    </div>
                    <div className="flex">
                      <div className="flex-1 px-2 py-1 text-center border-r border-[var(--color-border)] bg-orange-50 text-orange-700 font-semibold">
                        Original (A)
                      </div>
                      <div className="flex-1 px-2 py-1 text-center bg-blue-50 text-blue-700 font-semibold">
                        Modified (B)
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-[150px] px-2 py-2.5 border-r border-[var(--color-border)] truncate"
                  >
                    {colName}
                  </div>
                );
              }
            })}
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
                  {/* Line A */}
                  <div className="flex-shrink-0 w-[50px] px-2 flex items-center justify-center border-r border-[var(--color-border)] text-[var(--color-muted-foreground)] font-mono">
                    {row.lineNumberA || '-'}
                  </div>
                  {/* Line B */}
                  <div className="flex-shrink-0 w-[50px] px-2 flex items-center justify-center border-r border-[var(--color-border)] text-[var(--color-muted-foreground)] font-mono">
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
          Total: {filteredRows.length.toLocaleString()} rows
        </div>
      </div>
    </div>
  );
}

/**
 * Side-by-side cell for "Difference Records" tab.
 * Shows Original (A) value and Modified (B) value next to each other.
 * Highlights cells where values differ.
 */
function SideBySideCell({ cell }: { cell: DiffCell }) {
  const isChanged = cell.status === 'changed';

  return (
    <div
      className={cn(
        'flex-shrink-0 flex items-stretch border-r border-[var(--color-border)]',
      )}
      style={{ width: 300 }}
    >
      {/* Original Value (A) */}
      <div
        className={cn(
          'flex-1 px-2 flex items-center border-r border-[var(--color-border)] truncate',
          isChanged ? 'bg-red-50 text-red-900 font-medium' : 'text-[var(--color-foreground)]'
        )}
      >
        <span className="truncate">{cell.valueA ?? ''}</span>
      </div>
      {/* Modified Value (B) */}
      <div
        className={cn(
          'flex-1 px-2 flex items-center truncate',
          isChanged ? 'bg-green-50 text-green-900 font-medium' : 'text-[var(--color-foreground)]'
        )}
      >
        <span className="truncate">{cell.valueB ?? ''}</span>
      </div>
    </div>
  );
}

/**
 * Single cell display for non-difference tabs (Only in Original, Only in Modified, Matched).
 */
function SingleCell({ cell, rowStatus }: { cell: DiffCell; rowStatus: RowStatus }) {
  const displayValue = rowStatus === 'added'
    ? (cell.valueB ?? '')
    : (cell.valueA ?? '');

  return (
    <div className="flex-shrink-0 w-[150px] px-2 flex items-center border-r border-[var(--color-border)] truncate">
      <span className="truncate">{displayValue}</span>
    </div>
  );
}

function getRowBgColor(status: RowStatus): string {
  switch (status) {
    case 'added': return 'bg-green-50/30';
    case 'removed': return 'bg-red-50/30';
    case 'modified': return 'hover:bg-slate-50';
    case 'moved': return 'bg-blue-50/30';
    default: return 'hover:bg-slate-50';
  }
}
