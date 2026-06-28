import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Link2, Link2Off, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ColumnMapping } from '@/types';

export function ColumnMappingPanel() {
  const {
    parsedFileA,
    parsedFileB,
    comparisonConfig,
    setComparisonConfig,
  } = useAppStore();

  const headersA = parsedFileA?.headers || [];
  const headersB = parsedFileB?.headers || [];
  const mappings = comparisonConfig.columnMappings;

  // Auto-map on first render if no mappings set yet
  useEffect(() => {
    if (mappings.length === 0 && headersA.length > 0 && headersB.length > 0) {
      handleAutoMap();
    }
  }, [headersA.length, headersB.length]);

  const handleAutoMap = () => {
    const autoMappings: ColumnMapping[] = [];
    const usedB = new Set<number>();

    for (let i = 0; i < headersA.length; i++) {
      const normalizedA = headersA[i].toLowerCase().trim();
      let matchedB = -1;

      for (let j = 0; j < headersB.length; j++) {
        if (usedB.has(j)) continue;
        const normalizedB = headersB[j].toLowerCase().trim();
        if (normalizedA === normalizedB) {
          matchedB = j;
          break;
        }
      }

      if (matchedB >= 0) {
        usedB.add(matchedB);
      }
      autoMappings.push({
        columnIndexA: i,
        columnIndexB: matchedB,
        headerA: headersA[i],
        headerB: matchedB >= 0 ? headersB[matchedB] : '',
      });
    }

    // Add unmapped B columns
    for (let j = 0; j < headersB.length; j++) {
      if (!usedB.has(j)) {
        autoMappings.push({
          columnIndexA: -1,
          columnIndexB: j,
          headerA: '',
          headerB: headersB[j],
        });
      }
    }

    setComparisonConfig({ columnMappings: autoMappings });
  };

  const updateMapping = (index: number, columnIndexB: number) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      columnIndexB,
      headerB: columnIndexB >= 0 ? headersB[columnIndexB] : '',
    };
    setComparisonConfig({ columnMappings: newMappings });
  };

  const removeMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    setComparisonConfig({ columnMappings: newMappings });
  };

  if (headersA.length === 0 || headersB.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-[var(--color-border)] rounded-xl">
        <Link2Off className="w-8 h-8 mx-auto text-[var(--color-muted-foreground)] mb-2" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Parse both files first to see column headers for mapping.
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
          Column mapping will auto-detect after parsing.
        </p>
      </div>
    );
  }

  // Get B columns already used in other mappings
  const usedBIndices = new Set(
    mappings.filter(m => m.columnIndexB >= 0).map(m => m.columnIndexB)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--color-foreground)]">Column Mapping</h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            Map columns from File A to corresponding columns in File B
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={handleAutoMap}>
          <Wand2 className="w-3.5 h-3.5" />
          Auto-Map
        </Button>
      </div>

      {/* Mapping Table */}
      <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_40px_1fr_40px] gap-0 bg-slate-100 border-b border-[var(--color-border)]">
          <div className="px-3 py-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
            File A Column
          </div>
          <div className="flex items-center justify-center">
            <Link2 className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
          </div>
          <div className="px-3 py-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
            File B Column
          </div>
          <div></div>
        </div>

        {/* Rows */}
        <div className="max-h-[320px] overflow-y-auto divide-y divide-[var(--color-border)]">
          {mappings.map((mapping, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_40px_1fr_40px] gap-0 items-center hover:bg-slate-50"
            >
              {/* File A header */}
              <div className="px-3 py-2.5">
                {mapping.columnIndexA >= 0 ? (
                  <span className="text-sm font-medium text-[var(--color-foreground)]">
                    {mapping.headerA}
                    <span className="ml-1.5 text-xs text-[var(--color-muted-foreground)]">
                      [{mapping.columnIndexA}]
                    </span>
                  </span>
                ) : (
                  <span className="text-sm text-[var(--color-muted-foreground)] italic">
                    (not in File A)
                  </span>
                )}
              </div>

              {/* Link icon */}
              <div className="flex items-center justify-center">
                {mapping.columnIndexA >= 0 && mapping.columnIndexB >= 0 ? (
                  <Link2 className="w-4 h-4 text-[var(--color-primary)]" />
                ) : (
                  <Link2Off className="w-4 h-4 text-[var(--color-muted-foreground)]" />
                )}
              </div>

              {/* File B dropdown */}
              <div className="px-3 py-1.5">
                <select
                  value={mapping.columnIndexB}
                  onChange={(e) => updateMapping(index, parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 rounded border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  <option value={-1}>-- Not Mapped --</option>
                  {headersB.map((header, bIdx) => (
                    <option
                      key={bIdx}
                      value={bIdx}
                      disabled={usedBIndices.has(bIdx) && mapping.columnIndexB !== bIdx}
                    >
                      {header} [{bIdx}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Remove */}
              <div className="flex items-center justify-center">
                {mapping.columnIndexA === -1 && (
                  <button
                    onClick={() => removeMapping(index)}
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] text-xs"
                    title="Remove"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {mappings.filter(m => m.columnIndexB >= 0 && m.columnIndexA >= 0).length} of{' '}
        {headersA.length} columns mapped.
        {headersB.length - mappings.filter(m => m.columnIndexB >= 0).length > 0 && (
          <span className="ml-1 text-amber-600">
            {headersB.length - mappings.filter(m => m.columnIndexB >= 0).length} File B columns unmapped.
          </span>
        )}
      </p>
    </div>
  );
}
