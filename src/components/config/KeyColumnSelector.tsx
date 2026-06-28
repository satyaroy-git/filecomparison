import { useAppStore } from '@/stores/app-store';
import { Key } from 'lucide-react';

export function KeyColumnSelector() {
  const {
    parsedFileA,
    parsedFileB,
    comparisonConfig,
    setComparisonConfig,
  } = useAppStore();

  const headersA = parsedFileA?.headers || [];
  const headersB = parsedFileB?.headers || [];

  const toggleKeyColumnA = (colIndex: number) => {
    const current = comparisonConfig.keyColumns;
    const updated = current.includes(colIndex)
      ? current.filter(c => c !== colIndex)
      : [...current, colIndex];
    setComparisonConfig({ keyColumns: updated });
  };

  const toggleKeyColumnB = (colIndex: number) => {
    const current = comparisonConfig.keyColumnsB;
    const updated = current.includes(colIndex)
      ? current.filter(c => c !== colIndex)
      : [...current, colIndex];
    setComparisonConfig({ keyColumnsB: updated });
  };

  if (headersA.length === 0 && headersB.length === 0) {
    return (
      <div className="p-4 border-2 border-dashed border-[var(--color-border)] rounded-xl text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Parse files first to select key columns by name.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-[var(--color-foreground)] flex items-center gap-2">
          <Key className="w-4 h-4" />
          Unique Key Column(s)
        </h3>
        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
          Select the column(s) that uniquely identify each row. If headers differ, select the corresponding key in each file.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* File A Key Columns */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">
            File A Key
          </label>
          <div className="border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] max-h-[200px] overflow-y-auto">
            {headersA.map((header, idx) => (
              <label
                key={idx}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={comparisonConfig.keyColumns.includes(idx)}
                  onChange={() => toggleKeyColumnA(idx)}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-foreground)]">{header}</span>
                <span className="text-xs text-[var(--color-muted-foreground)] ml-auto">[{idx}]</span>
              </label>
            ))}
          </div>
          {comparisonConfig.keyColumns.length > 0 && (
            <p className="text-xs text-[var(--color-primary)] font-medium">
              Selected: {comparisonConfig.keyColumns.map(i => headersA[i]).join(', ')}
            </p>
          )}
        </div>

        {/* File B Key Columns */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">
            File B Key
            <span className="ml-1 font-normal normal-case">(if different from A)</span>
          </label>
          <div className="border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] max-h-[200px] overflow-y-auto">
            {headersB.map((header, idx) => (
              <label
                key={idx}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={comparisonConfig.keyColumnsB.includes(idx)}
                  onChange={() => toggleKeyColumnB(idx)}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-foreground)]">{header}</span>
                <span className="text-xs text-[var(--color-muted-foreground)] ml-auto">[{idx}]</span>
              </label>
            ))}
          </div>
          {comparisonConfig.keyColumnsB.length > 0 && (
            <p className="text-xs text-[var(--color-primary)] font-medium">
              Selected: {comparisonConfig.keyColumnsB.map(i => headersB[i]).join(', ')}
            </p>
          )}
          {comparisonConfig.keyColumnsB.length === 0 && comparisonConfig.keyColumns.length > 0 && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Will use same column indices as File A.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
