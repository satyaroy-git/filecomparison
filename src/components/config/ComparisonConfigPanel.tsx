import { useAppStore } from '@/stores/app-store';
import type { MatchStrategy, JoinType } from '@/types';

export function ComparisonConfigPanel() {
  const { comparisonConfig, setComparisonConfig, parsedFileA } = useAppStore();

  return (
    <div className="space-y-6">
      {/* Match Strategy */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-foreground)]">Row Matching Strategy</label>
        <select
          value={comparisonConfig.matchStrategy}
          onChange={(e) => setComparisonConfig({ matchStrategy: e.target.value as MatchStrategy })}
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="position">Position (row-by-row)</option>
          <option value="key">Key Column(s)</option>
          <option value="fuzzy">Fuzzy Matching</option>
        </select>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {comparisonConfig.matchStrategy === 'position' && 'Compare rows at the same line number.'}
          {comparisonConfig.matchStrategy === 'key' && 'Match rows by a unique key column (e.g., ID, email).'}
          {comparisonConfig.matchStrategy === 'fuzzy' && 'Find best-matching rows using similarity scoring.'}
        </p>
      </div>

      {/* Key Columns (shown when strategy is 'key') */}
      {comparisonConfig.matchStrategy === 'key' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Key Column Indices</label>
          <input
            type="text"
            value={comparisonConfig.keyColumns.join(', ')}
            onChange={(e) => {
              const cols = e.target.value
                .split(',')
                .map(s => parseInt(s.trim()))
                .filter(n => !isNaN(n));
              setComparisonConfig({ keyColumns: cols });
            }}
            placeholder="0, 1 (comma-separated column indices)"
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Enter zero-based column indices to use as matching keys.
          </p>
        </div>
      )}

      {/* Fuzzy Threshold */}
      {comparisonConfig.matchStrategy === 'fuzzy' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">
            Similarity Threshold: {(comparisonConfig.fuzzyThreshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={comparisonConfig.fuzzyThreshold}
            onChange={(e) => setComparisonConfig({ fuzzyThreshold: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Rows with similarity above this threshold will be matched.
          </p>
        </div>
      )}

      {/* Join Type */}
      {comparisonConfig.matchStrategy === 'key' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Join Type</label>
          <select
            value={comparisonConfig.joinType}
            onChange={(e) => setComparisonConfig({ joinType: e.target.value as JoinType })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="full-outer">Full Outer (show all rows)</option>
            <option value="inner">Inner (only matched rows)</option>
            <option value="left">Left (keep all from File A)</option>
          </select>
        </div>
      )}

      {/* Comparison Options */}
      <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
        <h3 className="text-sm font-medium text-[var(--color-foreground)]">Comparison Options</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-foreground)]">Numeric Tolerance</label>
            <input
              type="number"
              value={comparisonConfig.numericTolerance}
              onChange={(e) => setComparisonConfig({ numericTolerance: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.001}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-foreground)]">Ignore Columns</label>
            <input
              type="text"
              value={comparisonConfig.ignoreColumns.join(', ')}
              onChange={(e) => {
                const cols = e.target.value
                  .split(',')
                  .map(s => parseInt(s.trim()))
                  .filter(n => !isNaN(n));
                setComparisonConfig({ ignoreColumns: cols });
              }}
              placeholder="Column indices to ignore"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={comparisonConfig.caseSensitive}
            onChange={(e) => setComparisonConfig({ caseSensitive: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-foreground)]">Case sensitive comparison</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={comparisonConfig.trimBeforeCompare}
            onChange={(e) => setComparisonConfig({ trimBeforeCompare: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-foreground)]">Trim values before comparing</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={comparisonConfig.ignoreWhitespace}
            onChange={(e) => setComparisonConfig({ ignoreWhitespace: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-foreground)]">Ignore whitespace differences</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={comparisonConfig.treatEmptyAsNull}
            onChange={(e) => setComparisonConfig({ treatEmptyAsNull: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-foreground)]">Treat empty strings as NULL</span>
        </label>
      </div>
    </div>
  );
}
