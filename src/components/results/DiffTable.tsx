import { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/utils/cn';
import type { DiffRow, DiffCell, RowStatus, ColumnMapping } from '@/types';
import React from 'react';

interface DiffTableProps {
  filterStatus: RowStatus;
  searchQuery?: string;
}

export function DiffTable({ filterStatus, searchQuery = '' }: DiffTableProps) {
  const { diffResult } = useAppStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(() => {
    if (!diffResult) return [];
    let rows = diffResult.rows.filter(row => row.status === filterStatus);

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
    if (diffResult.columnMappings && diffResult.columnMappings.length > 0) {
      return diffResult.columnMappings;
    }
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
    estimateSize: () => 40,
    overscan: 20,
  });

  // Sync horizontal scroll between header and body
  const handleBodyScroll = useCallback(() => {
    if (parentRef.current && headerRef.current) {
      headerRef.current.scrollLeft = parentRef.current.scrollLeft;
    }
  }, []);

  if (!diffResult) return null;

  if (filteredRows.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-[var(--color-border)] rounded-xl">
        <p className="text-sm text-[var(--color-muted-foreground)]">No rows to display in this category.</p>
      </div>
    );
  }

  const showSideBySide = filterStatus === 'modified';
  const COL_WIDTH = 140;
  const ROW_NUM_WIDTH = 50;

  // Calculate total table width
  const totalWidth = showSideBySide
    ? ROW_NUM_WIDTH * 2 + mappings.length * COL_WIDTH * 2
    : ROW_NUM_WIDTH + mappings.length * 150;

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
        {/* Fixed Header - scrolls horizontally in sync with body */}
        <div
          ref={headerRef}
          className="overflow-hidden border-b border-[var(--color-border)]"
        >
          <div style={{ width: totalWidth }}>
            {showSideBySide ? (
              <>
                {/* Row 1: Column names */}
                <div className="flex bg-slate-100 border-b border-[var(--color-border)]">
                  <div className="flex-shrink-0 flex items-center justify-center text-[11px] font-semibold text-[var(--color-muted-foreground)] border-r border-[var(--color-border)]" style={{ width: ROW_NUM_WIDTH }}>#A</div>
                  <div className="flex-shrink-0 flex items-center justify-center text-[11px] font-semibold text-[var(--color-muted-foreground)] border-r border-[var(--color-border)]" style={{ width: ROW_NUM_WIDTH }}>#B</div>
                  {mappings.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 flex items-center justify-center text-xs font-bold text-[var(--color-foreground)] border-r border-[var(--color-border)] py-1.5"
                      style={{ width: COL_WIDTH * 2 }}
                    >
                      {m.headerA || m.headerB || `Column ${idx + 1}`}
                    </div>
                  ))}
                </div>
                {/* Row 2: Original / Modified sub-headers */}
                <div className="flex bg-slate-50">
                  <div className="flex-shrink-0 border-r border-[var(--color-border)]" style={{ width: ROW_NUM_WIDTH }}></div>
                  <div className="flex-shrink-0 border-r border-[var(--color-border)]" style={{ width: ROW_NUM_WIDTH }}></div>
                  {mappings.map((_, idx) => (
                    <React.Fragment key={idx}>
                      <div
                        className="flex-shrink-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 border-r border-[var(--color-border)] py-1"
                        style={{ width: COL_WIDTH }}
                      >
                        Original (A)
                      </div>
                      <div
                        className="flex-shrink-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-r border-[var(--color-border)] py-1"
                        style={{ width: COL_WIDTH }}
                      >
                        Modified (B)
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex bg-slate-100">
                <div className="flex-shrink-0 flex items-center justify-center text-[11px] font-semibold text-[var(--color-muted-foreground)] border-r border-[var(--color-border)] py-2.5" style={{ width: ROW_NUM_WIDTH }}>
                  {filterStatus === 'added' ? '#B' : '#A'}
                </div>
                {mappings.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 flex items-center px-2 text-[11px] font-semibold text-[var(--color-muted-foreground)] border-r border-[var(--color-border)] py-2.5 truncate"
                    style={{ width: 150 }}
                  >
                    {m.headerA || m.headerB || `Column ${idx + 1}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div
          ref={parentRef}
          onScroll={handleBodyScroll}
          className="overflow-auto"
          style={{ height: Math.min(filteredRows.length * 40, 520) }}
        >
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              width: totalWidth,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = filteredRows[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className={cn(
                    'absolute top-0 left-0 flex items-stretch border-b border-[var(--color-border)]',
                    getRowBgColor(row.status)
                  )}
                  style={{
                    height: virtualRow.size,
                    width: totalWidth,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {showSideBySide ? (
                    <>
                      <div className="flex-shrink-0 flex items-center justify-center text-xs text-[var(--color-muted-foreground)] font-mono border-r border-[var(--color-border)]" style={{ width: ROW_NUM_WIDTH }}>
                        {row.lineNumberA || '-'}
                      </div>
                      <div className="flex-shrink-0 flex items-center justify-center text-xs text-[var(--color-muted-foreground)] font-mono border-r border-[var(--color-border)]" style={{ width: ROW_NUM_WIDTH }}>
                        {row.lineNumberB || '-'}
                      </div>
                      {row.cells.map((cell, i) => (
                        <SideBySideCells key={i} cell={cell} width={COL_WIDTH} />
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="flex-shrink-0 flex items-center justify-center text-xs text-[var(--color-muted-foreground)] font-mono border-r border-[var(--color-border)]" style={{ width: ROW_NUM_WIDTH }}>
                        {filterStatus === 'added' ? (row.lineNumberB || '-') : (row.lineNumberA || '-')}
                      </div>
                      {row.cells.map((cell, i) => (
                        <div key={i} className="flex-shrink-0 flex items-center px-2 text-xs border-r border-[var(--color-border)] truncate" style={{ width: 150 }}>
                          {filterStatus === 'added' ? (cell.valueB ?? '') : (cell.valueA ?? '')}
                        </div>
                      ))}
                    </>
                  )}
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

function SideBySideCells({ cell, width }: { cell: DiffCell; width: number }) {
  const isChanged = cell.status === 'changed';

  return (
    <>
      <div
        className={cn(
          'flex-shrink-0 flex items-center px-2 text-xs border-r border-[var(--color-border)] truncate',
          isChanged ? 'bg-red-100 text-red-900 font-semibold' : ''
        )}
        style={{ width }}
      >
        {cell.valueA ?? ''}
      </div>
      <div
        className={cn(
          'flex-shrink-0 flex items-center px-2 text-xs border-r border-[var(--color-border)] truncate',
          isChanged ? 'bg-green-100 text-green-900 font-semibold' : ''
        )}
        style={{ width }}
      >
        {cell.valueB ?? ''}
      </div>
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
