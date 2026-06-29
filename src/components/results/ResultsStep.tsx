import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/Button';
import { SummaryPanel } from './SummaryPanel';
import { DiffTable } from './DiffTable';
import { ExcelExport } from './ExcelExport';
import { PdfExport } from './PdfExport';
import { SearchFilter } from './SearchFilter';
import { ArrowLeft, RotateCcw, Keyboard } from 'lucide-react';
import type { ResultsTab } from '@/types';
import { cn } from '@/utils/cn';
import { useState } from 'react';

const TABS: { id: ResultsTab; label: string }[] = [
  { id: 'summary', label: '1. Summary' },
  { id: 'differences', label: '2. Difference Records' },
  { id: 'only-original', label: '3. Only in Original File' },
  { id: 'only-modified', label: '4. Only in Modified File' },
  { id: 'matched', label: '5. All Matched Rows' },
];

export function ResultsStep() {
  const {
    diffResult,
    activeResultsTab,
    setActiveResultsTab,
    setStep,
    reset,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);

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

  const getTabCount = (tabId: ResultsTab): number => {
    switch (tabId) {
      case 'summary': return diffResult.rows.length;
      case 'differences': return diffResult.summary.modifiedRows;
      case 'only-original': return diffResult.summary.removedRows;
      case 'only-modified': return diffResult.summary.addedRows;
      case 'matched': return diffResult.summary.unchangedRows;
      default: return 0;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Summary Cards */}
      <SummaryPanel summary={diffResult.summary} columnStats={diffResult.columnStats} />

      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveResultsTab(tab.id)}
              className={cn(
                'relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
                activeResultsTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-slate-300'
              )}
            >
              {tab.label}
              {tab.id !== 'summary' && (
                <span
                  className={cn(
                    'ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                    activeResultsTab === tab.id
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-slate-200 text-slate-600'
                  )}
                >
                  {getTabCount(tab.id).toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Export Buttons */}
        <div className="flex-shrink-0 pl-4 flex gap-2">
          <PdfExport />
          <ExcelExport />
        </div>
      </div>

      {/* Search + Shortcuts */}
      {activeResultsTab !== 'summary' && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchFilter
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search within results (filters rows containing text)..."
            />
          </div>
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="p-2 rounded-lg hover:bg-slate-100 text-[var(--color-muted-foreground)]"
            title="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && (
        <div className="p-3 rounded-lg bg-slate-100 border border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
          <span className="font-semibold text-[var(--color-foreground)]">Keyboard Shortcuts:</span>{' '}
          Ctrl+1-5 Switch tabs &middot; Ctrl+D Differences &middot; Escape Go back &middot; Ctrl+Shift+N New comparison
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeResultsTab === 'summary' && <SummaryTabContent />}
        {activeResultsTab === 'differences' && <DiffTable filterStatus="modified" searchQuery={searchQuery} />}
        {activeResultsTab === 'only-original' && <DiffTable filterStatus="removed" searchQuery={searchQuery} />}
        {activeResultsTab === 'only-modified' && <DiffTable filterStatus="added" searchQuery={searchQuery} />}
        {activeResultsTab === 'matched' && <DiffTable filterStatus="unchanged" searchQuery={searchQuery} />}
      </div>

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

function SummaryTabContent() {
  const { diffResult } = useAppStore();
  if (!diffResult) return null;

  return (
    <div className="space-y-6">
      {/* File Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-white">
          <h4 className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide mb-2">Original File (A)</h4>
          <p className="text-2xl font-bold">{diffResult.summary.totalRowsA.toLocaleString()}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">rows &middot; {diffResult.headersA.length} columns</p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-white">
          <h4 className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide mb-2">Modified File (B)</h4>
          <p className="text-2xl font-bold">{diffResult.summary.totalRowsB.toLocaleString()}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">rows &middot; {diffResult.headersB.length} columns</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-center">
          <p className="text-2xl font-bold text-amber-700">{diffResult.summary.modifiedRows}</p>
          <p className="text-xs text-amber-600 mt-0.5">Difference Records</p>
        </div>
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-center">
          <p className="text-2xl font-bold text-red-700">{diffResult.summary.removedRows}</p>
          <p className="text-xs text-red-600 mt-0.5">Only in Original</p>
        </div>
        <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-center">
          <p className="text-2xl font-bold text-green-700">{diffResult.summary.addedRows}</p>
          <p className="text-xs text-green-600 mt-0.5">Only in Modified</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
          <p className="text-2xl font-bold text-slate-700">{diffResult.summary.unchangedRows}</p>
          <p className="text-xs text-slate-600 mt-0.5">Matched Rows</p>
        </div>
      </div>

      {/* Column Statistics Table */}
      <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold">Column-Level Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-slate-50/50">
                <th className="text-left py-2.5 px-4 font-medium">Column</th>
                <th className="text-right py-2.5 px-4 font-medium">Total</th>
                <th className="text-right py-2.5 px-4 font-medium">Changed</th>
                <th className="text-right py-2.5 px-4 font-medium">Added</th>
                <th className="text-right py-2.5 px-4 font-medium">Removed</th>
                <th className="text-right py-2.5 px-4 font-medium">% Changed</th>
              </tr>
            </thead>
            <tbody>
              {diffResult.columnStats.map(stat => (
                <tr key={stat.columnIndex} className="border-b border-[var(--color-border)] last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-medium">{stat.columnName}</td>
                  <td className="text-right py-2.5 px-4">{stat.totalCells}</td>
                  <td className="text-right py-2.5 px-4 text-amber-600 font-medium">{stat.changedCells || '-'}</td>
                  <td className="text-right py-2.5 px-4 text-green-600">{stat.addedCells || '-'}</td>
                  <td className="text-right py-2.5 px-4 text-red-600">{stat.removedCells || '-'}</td>
                  <td className="text-right py-2.5 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${Math.min(stat.changePercentage, 100)}%` }}
                        />
                      </div>
                      <span className={stat.changePercentage > 0 ? 'text-amber-600 font-medium' : ''}>
                        {stat.changePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Time */}
      <p className="text-xs text-[var(--color-muted-foreground)] text-center">
        Comparison completed in {diffResult.summary.comparisonTimeMs.toFixed(0)}ms
      </p>
    </div>
  );
}
