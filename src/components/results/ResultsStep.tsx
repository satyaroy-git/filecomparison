import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/Button';
import { SummaryPanel } from './SummaryPanel';
import { DiffTable } from './DiffTable';
import { ArrowLeft, RotateCcw, Download } from 'lucide-react';
import type { ViewMode, DiffFilter } from '@/types';

export function ResultsStep() {
  const {
    diffResult,
    uiState,
    setViewMode,
    setDiffFilter,
    toggleShowUnchanged,
    setStep,
    reset,
  } = useAppStore();

  if (!diffResult) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-muted-foreground)]">No results to display.</p>
        <Button variant="secondary" className="mt-4" onClick={() => setStep('upload')}>
          Start Over
        </Button>
      </div>
    );
  }

  const handleExportCSV = () => {
    const headers = ['Status', 'Line A', 'Line B', ...diffResult.headersA.map((h, i) => `${h} (A)`), ...diffResult.headersB.map((h, i) => `${h} (B)`)];
    const rows = diffResult.rows.map(row => {
      const valuesA = row.cells.map(c => c.valueA || '');
      const valuesB = row.cells.map(c => c.valueB || '');
      return [row.status, row.lineNumberA || '', row.lineNumberB || '', ...valuesA, ...valuesB].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff-result.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewModes: { value: ViewMode; label: string }[] = [
    { value: 'side-by-side', label: 'Side by Side' },
    { value: 'table', label: 'Table' },
    { value: 'summary', label: 'Summary' },
  ];

  const filters: { value: DiffFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: diffResult.rows.length },
    { value: 'modified', label: 'Modified', count: diffResult.summary.modifiedRows },
    { value: 'added', label: 'Added', count: diffResult.summary.addedRows },
    { value: 'removed', label: 'Removed', count: diffResult.summary.removedRows },
    { value: 'unchanged', label: 'Unchanged', count: diffResult.summary.unchangedRows },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <SummaryPanel summary={diffResult.summary} columnStats={diffResult.columnStats} />

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 py-3 px-4 bg-[var(--color-muted)] rounded-xl">
        {/* View Mode */}
        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-[var(--color-border)]">
          {viewModes.map(mode => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                uiState.viewMode === mode.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1">
          {filters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setDiffFilter(filter.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                uiState.diffFilter === filter.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-white text-[var(--color-muted-foreground)] hover:bg-slate-100 border border-[var(--color-border)]'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Results Content */}
      {uiState.viewMode === 'summary' ? (
        <div className="p-6 border border-[var(--color-border)] rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Column Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2 px-3 font-medium">Column</th>
                  <th className="text-right py-2 px-3 font-medium">Total</th>
                  <th className="text-right py-2 px-3 font-medium">Changed</th>
                  <th className="text-right py-2 px-3 font-medium">Added</th>
                  <th className="text-right py-2 px-3 font-medium">Removed</th>
                  <th className="text-right py-2 px-3 font-medium">% Changed</th>
                </tr>
              </thead>
              <tbody>
                {diffResult.columnStats.map(stat => (
                  <tr key={stat.columnIndex} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2 px-3 font-medium">{stat.columnName}</td>
                    <td className="text-right py-2 px-3">{stat.totalCells}</td>
                    <td className="text-right py-2 px-3 text-amber-600">{stat.changedCells}</td>
                    <td className="text-right py-2 px-3 text-green-600">{stat.addedCells}</td>
                    <td className="text-right py-2 px-3 text-red-600">{stat.removedCells}</td>
                    <td className="text-right py-2 px-3">
                      <span className={stat.changePercentage > 0 ? 'text-amber-600 font-medium' : ''}>
                        {stat.changePercentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <DiffTable />
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
        <Button variant="ghost" onClick={() => setStep('configure')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Config
        </Button>
        <Button variant="secondary" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
          New Comparison
        </Button>
      </div>
    </div>
  );
}
