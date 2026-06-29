import { useState, useEffect } from 'react';
import { getHistory, clearHistory } from '@/utils/history';
import type { ComparisonHistoryEntry } from '@/utils/history';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function RecentComparisons() {
  const [history, setHistory] = useState<ComparisonHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  if (history.length === 0) return null;

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)] flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Comparisons
        </h3>
        <Button size="sm" variant="ghost" onClick={handleClear}>
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {history.slice(0, 6).map(entry => (
          <div
            key={entry.id}
            className="p-3 rounded-lg border border-[var(--color-border)] bg-white hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--color-foreground)] truncate">
                  {entry.fileAName}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                  vs {entry.fileBName}
                </p>
              </div>
              <span className="text-[9px] text-[var(--color-muted-foreground)] whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleDateString()}
              </span>
            </div>
            <div className="flex gap-3 mt-2 text-[10px]">
              <span className="text-amber-600 font-medium">{entry.modifiedRows} diff</span>
              <span className="text-red-600">{entry.removedRows} del</span>
              <span className="text-green-600">{entry.addedRows} add</span>
              <span className="text-slate-500">{entry.matchedRows} ok</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
