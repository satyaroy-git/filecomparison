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
    XLSX.utils.book_append_sheet(wb, summaryWs, '1. Summary');

    // Sheet 2: Difference Records (modified rows - Original vs Modified side by side)
    const diffRows = diffResult.rows.filter(r => r.status === 'modified');
    const diffWs = buildDifferencesSheetWithStyles(diffRows, mappings);
    XLSX.utils.book_append_sheet(wb, diffWs, '2. Difference Records');

    // Sheet 3: Only in Original File (removed rows)
    const removedRows = diffResult.rows.filter(r => r.status === 'removed');
    const removedData = buildSingleSideSheet(removedRows, mappings, 'A');
    const removedWs = XLSX.utils.aoa_to_sheet(removedData);
    XLSX.utils.book_append_sheet(wb, removedWs, '3. Only in Original');

    // Sheet 4: Only in Modified File (added rows)
    const addedRows = diffResult.rows.filter(r => r.status === 'added');
    const addedData = buildSingleSideSheet(addedRows, mappings, 'B');
    const addedWs = XLSX.utils.aoa_to_sheet(addedData);
    XLSX.utils.book_append_sheet(wb, addedWs, '4. Only in Modified');

    // Sheet 5: All Matched Rows (unchanged rows)
    const matchedRows = diffResult.rows.filter(r => r.status === 'unchanged');
    const matchedData = buildSingleSideSheet(matchedRows, mappings, 'A');
    const matchedWs = XLSX.utils.aoa_to_sheet(matchedData);
    XLSX.utils.book_append_sheet(wb, matchedWs, '5. All Matched Rows');

    // Download
    XLSX.writeFile(wb, 'comparison-result.xlsx');
  };

  return (
    <Button size="sm" onClick={handleExport}>
      <Download className="w-3.5 h-3.5" />
      Download Excel
    </Button>
  );
}

/**
 * Build Summary sheet data.
 */
function buildSummarySheet(result: DiffResult): (string | number)[][] {
  const rows: (string | number)[][] = [];

  rows.push(['FILE COMPARISON SUMMARY']);
  rows.push([]);
  rows.push(['Metric', 'Count']);
  rows.push(['Total Rows in Original File (A)', result.summary.totalRowsA]);
  rows.push(['Total Rows in Modified File (B)', result.summary.totalRowsB]);
  rows.push([]);
  rows.push(['Difference Records (key matched, values differ)', result.summary.modifiedRows]);
  rows.push(['Only in Original File (not in Modified)', result.summary.removedRows]);
  rows.push(['Only in Modified File (not in Original)', result.summary.addedRows]);
  rows.push(['All Matched Rows (identical)', result.summary.unchangedRows]);
  rows.push([]);
  rows.push(['Comparison Time (ms)', Math.round(result.summary.comparisonTimeMs)]);
  rows.push([]);
  rows.push([]);

  // Column statistics
  rows.push(['COLUMN-LEVEL STATISTICS']);
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
 * Build Difference Records sheet with cell styling for changed values.
 * Changed Original cells get red background, Modified cells get green.
 */
function buildDifferencesSheetWithStyles(rows: DiffRow[], mappings: ColumnMapping[]): XLSX.WorkSheet {
  const data: (string | number | null)[][] = [];

  // Header row
  const header: (string | number | null)[] = ['Row# Original', 'Row# Modified', 'Key'];
  for (const m of mappings) {
    const colName = m.headerA || m.headerB || 'Column';
    header.push(`${colName} (Original)`);
    header.push(`${colName} (Modified)`);
    header.push(`${colName} Changed?`);
  }
  data.push(header);

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

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Apply cell styles for changed cells
  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    for (let mapIdx = 0; mapIdx < mappings.length; mapIdx++) {
      const changedColIdx = 3 + mapIdx * 3 + 2;
      const changedValue = data[rowIdx][changedColIdx];

      if (changedValue === 'YES') {
        const origColIdx = 3 + mapIdx * 3;
        const modColIdx = 3 + mapIdx * 3 + 1;

        // Red background for original changed value
        const origCellRef = XLSX.utils.encode_cell({ r: rowIdx, c: origColIdx });
        if (ws[origCellRef]) {
          ws[origCellRef].s = {
            fill: { fgColor: { rgb: 'FFC7CE' } },
            font: { color: { rgb: '9C0006' } },
          };
        }

        // Green background for modified changed value
        const modCellRef = XLSX.utils.encode_cell({ r: rowIdx, c: modColIdx });
        if (ws[modCellRef]) {
          ws[modCellRef].s = {
            fill: { fgColor: { rgb: 'C6EFCE' } },
            font: { color: { rgb: '006100' } },
          };
        }

        // Yellow for YES indicator
        const changedCellRef = XLSX.utils.encode_cell({ r: rowIdx, c: changedColIdx });
        if (ws[changedCellRef]) {
          ws[changedCellRef].s = {
            fill: { fgColor: { rgb: 'FFEB9C' } },
            font: { color: { rgb: '9C5700' } },
          };
        }
      }
    }
  }

  return ws;
}

/**
 * Build Difference Records sheet (plain, no styling).
 */
function buildDifferencesSheet(rows: DiffRow[], mappings: ColumnMapping[]): (string | number | null)[][] {
  const data: (string | number | null)[][] = [];

  // Header row
  const header: (string | number | null)[] = ['Row# Original', 'Row# Modified', 'Key'];
  for (const m of mappings) {
    const colName = m.headerA || m.headerB || 'Column';
    header.push(`${colName} (Original)`);
    header.push(`${colName} (Modified)`);
    header.push(`${colName} Changed?`);
  }
  data.push(header);

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
 * Build a single-side sheet (for Only in Original, Only in Modified, or All Matched).
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
