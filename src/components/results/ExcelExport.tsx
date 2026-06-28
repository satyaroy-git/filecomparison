import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DiffResult, DiffRow, ColumnMapping } from '@/types';

export function ExcelExport() {
  const { diffResult } = useAppStore();

  if (!diffResult) return null;

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const mappings = diffResult.columnMappings;

    // Sheet 1: Summary
    const summaryData = buildSummarySheet(diffResult);
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Sheet 2: Differences (modified rows - side by side)
    const diffRows = diffResult.rows.filter(r => r.status === 'modified');
    const diffData = buildDifferencesSheet(diffRows, mappings);
    const diffWs = XLSX.utils.aoa_to_sheet(diffData);
    XLSX.utils.book_append_sheet(wb, diffWs, 'Differences');

    // Sheet 3: Only in Original (removed rows)
    const removedRows = diffResult.rows.filter(r => r.status === 'removed');
    const removedData = buildSingleSideSheet(removedRows, mappings, 'A');
    const removedWs = XLSX.utils.aoa_to_sheet(removedData);
    XLSX.utils.book_append_sheet(wb, removedWs, 'Only in Original');

    // Sheet 4: Only in Modified (added rows)
    const addedRows = diffResult.rows.filter(r => r.status === 'added');
    const addedData = buildSingleSideSheet(addedRows, mappings, 'B');
    const addedWs = XLSX.utils.aoa_to_sheet(addedData);
    XLSX.utils.book_append_sheet(wb, addedWs, 'Only in Modified');

    // Sheet 5: Matched (unchanged rows)
    const matchedRows = diffResult.rows.filter(r => r.status === 'unchanged');
    const matchedData = buildSingleSideSheet(matchedRows, mappings, 'A');
    const matchedWs = XLSX.utils.aoa_to_sheet(matchedData);
    XLSX.utils.book_append_sheet(wb, matchedWs, 'Matched');

    // Download
    XLSX.writeFile(wb, 'comparison-result.xlsx');
  };

  return (
    <Button size="sm" variant="secondary" onClick={handleExport}>
      <Download className="w-3.5 h-3.5" />
      Export Excel
    </Button>
  );
}

/**
 * Build Summary sheet data (as array-of-arrays).
 */
function buildSummarySheet(result: DiffResult): (string | number)[][] {
  const rows: (string | number)[][] = [];

  rows.push(['Comparison Summary']);
  rows.push([]);
  rows.push(['Metric', 'Value']);
  rows.push(['Total Rows in Original (A)', result.summary.totalRowsA]);
  rows.push(['Total Rows in Modified (B)', result.summary.totalRowsB]);
  rows.push(['Modified Rows', result.summary.modifiedRows]);
  rows.push(['Added Rows (only in B)', result.summary.addedRows]);
  rows.push(['Removed Rows (only in A)', result.summary.removedRows]);
  rows.push(['Matched Rows (unchanged)', result.summary.unchangedRows]);
  rows.push(['Comparison Time (ms)', Math.round(result.summary.comparisonTimeMs)]);
  rows.push([]);
  rows.push([]);

  // Column statistics
  rows.push(['Column Statistics']);
  rows.push(['Column Name', 'Total Cells', 'Changed', 'Added', 'Removed', '% Changed']);
  for (const stat of result.columnStats) {
    rows.push([
      stat.columnName,
      stat.totalCells,
      stat.changedCells,
      stat.addedCells,
      stat.removedCells,
      Number(stat.changePercentage.toFixed(2)),
    ]);
  }

  return rows;
}

/**
 * Build Differences sheet - shows side-by-side values from both files for each mapped column.
 */
function buildDifferencesSheet(rows: DiffRow[], mappings: ColumnMapping[]): (string | number | null)[][] {
  const data: (string | number | null)[][] = [];

  // Header row 1: Column names spanning A and B
  const header1: (string | number | null)[] = ['Row# A', 'Row# B', 'Key'];
  for (const m of mappings) {
    const colName = m.headerA || m.headerB || 'Column';
    header1.push(`${colName} (A)`);
    header1.push(`${colName} (B)`);
    header1.push(`${colName} Changed?`);
  }
  data.push(header1);

  // Data rows
  for (const row of rows) {
    const dataRow: (string | number | null)[] = [
      row.lineNumberA,
      row.lineNumberB,
      row.keyValue || '',
    ];
    for (const cell of row.cells) {
      dataRow.push(cell.valueA ?? '');
      dataRow.push(cell.valueB ?? '');
      dataRow.push(cell.status === 'changed' ? 'YES' : '');
    }
    data.push(dataRow);
  }

  return data;
}

/**
 * Build a single-side sheet (for removed, added, or matched rows).
 * Shows values from the relevant side only.
 */
function buildSingleSideSheet(
  rows: DiffRow[],
  mappings: ColumnMapping[],
  side: 'A' | 'B'
): (string | number | null)[][] {
  const data: (string | number | null)[][] = [];

  // Header
  const header: (string | number | null)[] = ['Row#', 'Key'];
  for (const m of mappings) {
    header.push(m.headerA || m.headerB || 'Column');
  }
  data.push(header);

  // Data rows
  for (const row of rows) {
    const lineNum = side === 'A' ? row.lineNumberA : row.lineNumberB;
    const dataRow: (string | number | null)[] = [lineNum, row.keyValue || ''];
    for (const cell of row.cells) {
      const val = side === 'A' ? cell.valueA : cell.valueB;
      dataRow.push(val ?? '');
    }
    data.push(dataRow);
  }

  return data;
}
