import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/utils/cn';
import type { DiffRow, DiffCell, RowStatus, ColumnMapping } from '@/types';

interface DiffTableProps {
  filterStatus: RowStatus;
  searchQuery?: string;
}

export function DiffTable({ filterStatus, searchQuery = '' }: DiffTableProps) {
  const { diffResult } = useAppStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(() => {
    if (!diffResult) return [];
    let rows = diffResult.rows.filter(row => row.status === filterStatus);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      rows = rows.filter(row =>
        row.cells.some(cell => {
          const valA = (cell.valueA ?? '').toLowerCase();
          const valB = (cell.valueB ?? '').toLowerCase();
          return valA.includes(query) || valB.includes(query);
        }) ||
        (row.keyValue?.toLowerCase().includes(query))
      );
    }

    return rows;
  }, [diffResult, filterStatus, searchQuery]);

  const mappings: ColumnMapping[] = useMemo(() => {
    if (!diffResult) return [];
    // Use columnMappings from diff result; if empty, fallback to headers
    if (diffResult.columnMappings && diffResult.columnMappings.length > 0) {
      return diffResult.columnMappings;
    }
    // Fallback: generate from headersA
    return diffResult.headersA.map((h, i) => ({
      columnIndexA: i,
      columnIndexB: i < diffResult.headersB.length ? i : -1,
      headerA: h,
      headerB: i < diffResult.headersB.length ? diffResult.headersB[i] : '',
    }));
  }, [diffResult]);

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 20,
  });

  if (!diffResult) return null;

  if (filteredRows.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-[var(--color-border)] rounded-xl">
        <p className="text-sm text-[var(--color-muted-foreground)]">No rows to display in this category.</p>
      </div>
    );
  }

  // For "modified" (difference records), show side-by-side Original vs Modified for each column
  const showSideBySide = filterStatus === 'modified';

  const descriptions: Record<string, string> = {
    modified: 'Rows where key matched but column values differ. Each column shows Original (A) vs Modified (B) side by side.',
    removed: 'Rows that exist only in the Original file (not found in Modified file).',
    added: 'Rows that exist only in the Modified file (not found in Original file).',
    unchanged: 'Rows that matched by key and have identical values across all mapped columns.',
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-muted-foreground)] italic">
        {descriptions[filterStatus] || ''}
      </p>

      <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Scrollable container for both header and body */}
        <div className="overflow-x-auto">
          {/* Table Header */}
          <table className="w-max min-w-full border-collapse">
            <thead>
              {showSideBySide ? (
                <>
                  {/* Row 1: Column names */}
                  <tr className="bg-slate-100 border-b border-[var(--color-border)]">
                    <th className="w-[50px] px-2 py-2 text-center text-[11px] font-semibold text-[var(--color-muted-foreground)] border-r border-[var(--color-border)]" rowSpan={2}>#A</th>
                    <th className="w-[50px] px-2 py-2 text-center text-[11px] font-semibold text-[var(--color-muted-foreground)] border-r border-[var(--color-border)]" rowSpan={2}>#B</th>
                    {mappings.map((m, idx) => (
                      <th
                        key={idx}
                        colSpan={2}
                        className="px-2 py-1.5 text-center text-xs font-bold text-[var(--color-foreground)] border-r border-b border-[var(--color-border)]"
                      >
                        {m.headerA || m.headerB || `Column ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                  {/* Row 2: Original / Modified sub-headers */}
                  <tr className="bg-slate-50 border-b border-[var(--color-border)]">
                    {mappings.map((_, idx) => (
                      <React.Fragment key={idx}>
                        <th className="w-[140px] px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 border-r border-[var(--color-border)]">
                          Original (A)
                        </th>
                        <th className="w-[140px] px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-r border-[var(--color-border)]">
                          Modified (B)
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </>
              ) : (
                <tr className="bg-slate-100 border-b border-[var(--color-border)]">
                  <th className="w-[50px] px-2 py-2.5 text-center text-[11px] font-semibold text-[var(--color-muted-foreground)] border-r border-[var(--color-border)]">
                    {filterStatus === 'added' ? '#B' : '#A'}
                  </th>
                  {mappings.map((m, idx) => (
                    <th
                      key={idx}
                      className="w-[150px] px-2 py-2.5 text-left text-[11px] font-semibold text-[var(--color-muted-foreground)] border-r border-[var(--color-border)]"
                    >
                      {m.headerA || m.headerB || `Column ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
          </table>

          {/* Virtualized Body */}
          <div
            ref={parentRef}
            style={{ height: Math.min(filteredRows.length * 44, 520), overflow: 'auto' }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const row = filteredRows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    className="absolute left-0 w-max min-w-full border-b border-[var(--color-border)]"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <table className="w-max min-w-full border-collapse h-full">
                      <tbody>
                        <tr className={cn('h-full', getRowBgColor(row.status))}>
                          {showSideBySide ? (
                            <>
                              <td className="w-[50px] px-2 text-center text-xs text-[var(--color-muted-foreground)] font-mono border-r border-[var(--color-border)]">
                                {row.lineNumberA || '-'}
                              </td>
                              <td className="w-[50px] px-2 text-center text-xs text-[var(--color-muted-foreground)] font-mono border-r border-[var(--color-border)]">
                                {row.lineNumberB || '-'}
                              </td>
                              {row.cells.map((cell, i) => (
                                <SideBySideCells key={i} cell={cell} />
                              ))}
                            </>
                          ) : (
                            <>
                              <td className="w-[50px] px-2 text-center text-xs text-[var(--color-muted-foreground)] font-mono border-r border-[var(--color-border)]">
                                {filterStatus === 'added' ? (row.lineNumberB || '-') : (row.lineNumberA || '-')}
                              </td>
                              {row.cells.map((cell, i) => (
                                <td key={i} className="w-[150px] px-2 text-xs border-r border-[var(--color-border)] truncate">
                                  {filterStatus === 'added' ? (cell.valueB ?? '') : (cell.valueA ?? '')}
                                </td>
                              ))}
                            </>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
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
 * Renders two <td> cells side by side for a single column in the Difference Records tab.
 * Original (A) value on left, Modified (B) value on right.
 * Highlights when values are different.
 */
function SideBySideCells({ cell }: { cell: DiffCell }) {
  const isChanged = cell.status === 'changed';

  return (
    <>
      {/* Original (A) value */}
      <td
        className={cn(
          'w-[140px] px-2 text-xs border-r border-[var(--color-border)] truncate',
          isChanged ? 'bg-red-100 text-red-900 font-semibold' : ''
        )}
      >
        {cell.valueA ?? ''}
      </td>
      {/* Modified (B) value */}
      <td
        className={cn(
          'w-[140px] px-2 text-xs border-r border-[var(--color-border)] truncate',
          isChanged ? 'bg-green-100 text-green-900 font-semibold' : ''
        )}
      >
        {cell.valueB ?? ''}
      </td>
    </>
  );
}

function getRowBgColor(status: RowStatus): string {
  switch (status) {
    case 'added': return 'bg-green-50/30';
    case 'removed': return 'bg-red-50/30';
    case 'modified': return 'hover:bg-slate-50/50';
    default: return 'hover:bg-slate-50/50';
  }
}

// Need React import for Fragment
import React from 'react';
