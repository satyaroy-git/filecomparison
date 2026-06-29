import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Eye, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalLines: number;
}

export function DataPreview() {
  const { fileA, fileB, fileFormat, delimitedConfig } = useAppStore();
  const [previewA, setPreviewA] = useState<PreviewData | null>(null);
  const [previewB, setPreviewB] = useState<PreviewData | null>(null);
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);

  useEffect(() => {
    if (fileA && fileFormat === 'delimited') {
      loadPreview(fileA, setPreviewA, setErrorA);
    } else {
      setPreviewA(null);
      setErrorA(null);
    }
  }, [fileA, fileFormat, delimitedConfig.delimiter, delimitedConfig.hasHeader]);

  useEffect(() => {
    if (fileB && fileFormat === 'delimited') {
      loadPreview(fileB, setPreviewB, setErrorB);
    } else {
      setPreviewB(null);
      setErrorB(null);
    }
  }, [fileB, fileFormat, delimitedConfig.delimiter, delimitedConfig.hasHeader]);

  const loadPreview = async (
    file: File,
    setPreview: (d: PreviewData | null) => void,
    setError: (e: string | null) => void
  ) => {
    try {
      setError(null);
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const totalLines = lines.length;

      // Take first 6 lines for preview
      const previewText = lines.slice(0, 7).join('\n');
      const delimiter = delimitedConfig.delimiter === 'custom'
        ? (delimitedConfig.customDelimiter || ',')
        : delimitedConfig.delimiter;

      const result = Papa.parse(previewText, {
        delimiter,
        header: false,
        quoteChar: delimitedConfig.quoteChar || '"',
        skipEmptyLines: true,
      });

      const allRows = result.data as string[][];
      let headers: string[];
      let rows: string[][];

      if (delimitedConfig.hasHeader && allRows.length > 0) {
        headers = allRows[0].map(h => h.trim());
        rows = allRows.slice(1, 6);
      } else {
        const maxCols = allRows.reduce((max, row) => Math.max(max, row.length), 0);
        headers = Array.from({ length: maxCols }, (_, i) => `Col ${i + 1}`);
        rows = allRows.slice(0, 5);
      }

      // Warn if only 1 column
      if (headers.length <= 1 && totalLines > 1) {
        setError(`Only 1 column detected. Check if delimiter "${delimiter}" is correct.`);
      }

      setPreview({ headers, rows, totalLines });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview');
      setPreview(null);
    }
  };

  if (!fileA && !fileB) return null;
  if (fileFormat !== 'delimited') return null;
  if (!previewA && !previewB) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)] flex items-center gap-2">
        <Eye className="w-4 h-4" />
        Data Preview
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fileA && (
          <PreviewTable
            label="Original File (A)"
            fileName={fileA.name}
            preview={previewA}
            error={errorA}
          />
        )}
        {fileB && (
          <PreviewTable
            label="Modified File (B)"
            fileName={fileB.name}
            preview={previewB}
            error={errorB}
          />
        )}
      </div>
    </div>
  );
}

function PreviewTable({
  label,
  fileName,
  preview,
  error,
}: {
  label: string;
  fileName: string;
  preview: PreviewData | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="border border-amber-200 rounded-lg bg-amber-50 p-3">
        <p className="text-xs font-medium text-amber-800 mb-1">{label}: {fileName}</p>
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-[var(--color-border)] flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-foreground)]">{label}</span>
        <span className="text-[10px] text-[var(--color-muted-foreground)]">
          {preview.totalLines} rows &middot; {preview.headers.length} cols
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-slate-50/80">
              {preview.headers.map((h, i) => (
                <th key={i} className="px-2 py-1.5 text-left font-semibold text-[var(--color-foreground)] border-b border-r border-[var(--color-border)] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-2 py-1 border-b border-r border-[var(--color-border)] text-[var(--color-foreground)] whitespace-nowrap max-w-[150px] truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-1.5 bg-slate-50 text-[10px] text-[var(--color-muted-foreground)] border-t border-[var(--color-border)]">
        Showing first {preview.rows.length} of {preview.totalLines} rows
      </div>
    </div>
  );
}
