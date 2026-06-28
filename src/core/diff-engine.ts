import type {
  ParsedFile,
  ComparisonConfig,
  DiffResult,
  DiffRow,
  DiffCell,
  DiffSummary,
  ColumnStat,
  CharDiff,
  CellStatus,
  RowStatus,
  CompareProgress,
  ColumnMapping,
} from '@/types';

/**
 * Main comparison engine: compares two parsed files and produces a diff result.
 */
export async function compareFiles(
  fileA: ParsedFile,
  fileB: ParsedFile,
  config: ComparisonConfig,
  onProgress?: (progress: CompareProgress) => void
): Promise<DiffResult> {
  const startTime = performance.now();

  onProgress?.({ phase: 'matching', progress: 0, message: 'Matching rows...' });

  // Resolve effective column mappings
  const mappings = config.columnMappings.length > 0
    ? config.columnMappings
    : autoMapColumns(fileA.headers, fileB.headers);

  let diffRows: DiffRow[];

  switch (config.matchStrategy) {
    case 'key':
      diffRows = compareByKey(fileA, fileB, config, mappings, onProgress);
      break;
    case 'fuzzy':
      diffRows = compareByFuzzy(fileA, fileB, config, mappings, onProgress);
      break;
    case 'position':
    default:
      diffRows = compareByPosition(fileA, fileB, config, mappings, onProgress);
      break;
  }

  onProgress?.({ phase: 'stats', progress: 85, message: 'Computing statistics...' });

  // Compute column statistics
  const columnStats = computeColumnStats(diffRows, fileA.headers, fileB.headers, mappings);

  // Compute summary
  const summary: DiffSummary = {
    totalRowsA: fileA.totalRows,
    totalRowsB: fileB.totalRows,
    addedRows: diffRows.filter(r => r.status === 'added').length,
    removedRows: diffRows.filter(r => r.status === 'removed').length,
    modifiedRows: diffRows.filter(r => r.status === 'modified').length,
    unchangedRows: diffRows.filter(r => r.status === 'unchanged').length,
    movedRows: diffRows.filter(r => r.status === 'moved').length,
    totalColumns: mappings.length,
    comparisonTimeMs: performance.now() - startTime,
  };

  onProgress?.({ phase: 'complete', progress: 100, message: 'Comparison complete' });

  return {
    summary,
    rows: diffRows,
    columnStats,
    headersA: fileA.headers,
    headersB: fileB.headers,
    columnMappings: mappings,
  };
}

/**
 * Auto-map columns between files A and B by matching header names (case-insensitive).
 */
function autoMapColumns(headersA: string[], headersB: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
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
      mappings.push({
        columnIndexA: i,
        columnIndexB: matchedB,
        headerA: headersA[i],
        headerB: headersB[matchedB],
      });
    } else {
      // Column only in A — map to -1
      mappings.push({
        columnIndexA: i,
        columnIndexB: -1,
        headerA: headersA[i],
        headerB: '',
      });
    }
  }

  // Add columns only in B
  for (let j = 0; j < headersB.length; j++) {
    if (!usedB.has(j)) {
      mappings.push({
        columnIndexA: -1,
        columnIndexB: j,
        headerA: '',
        headerB: headersB[j],
      });
    }
  }

  return mappings;
}

/**
 * Compare files by position (row-by-row, line number based).
 */
function compareByPosition(
  fileA: ParsedFile,
  fileB: ParsedFile,
  config: ComparisonConfig,
  mappings: ColumnMapping[],
  onProgress?: (progress: CompareProgress) => void
): DiffRow[] {
  const maxRows = Math.max(fileA.rows.length, fileB.rows.length);
  const diffRows: DiffRow[] = [];

  for (let i = 0; i < maxRows; i++) {
    const rowA = i < fileA.rows.length ? fileA.rows[i] : null;
    const rowB = i < fileB.rows.length ? fileB.rows[i] : null;

    if (rowA && rowB) {
      const cells = compareCellsMapped(rowA, rowB, mappings, config);
      const hasChanges = cells.some(c => c.status !== 'same');
      
      diffRows.push({
        id: `row_${i}`,
        status: hasChanges ? 'modified' : 'unchanged',
        lineNumberA: i + 1,
        lineNumberB: i + 1,
        cells,
      });
    } else if (rowA && !rowB) {
      diffRows.push({
        id: `row_${i}`,
        status: 'removed',
        lineNumberA: i + 1,
        lineNumberB: null,
        cells: mappings.map((m, idx) => ({
          columnIndex: idx,
          status: 'removed' as CellStatus,
          valueA: m.columnIndexA >= 0 ? (rowA[m.columnIndexA] ?? null) : null,
          valueB: null,
        })),
      });
    } else if (!rowA && rowB) {
      diffRows.push({
        id: `row_${i}`,
        status: 'added',
        lineNumberA: null,
        lineNumberB: i + 1,
        cells: mappings.map((m, idx) => ({
          columnIndex: idx,
          status: 'added' as CellStatus,
          valueA: null,
          valueB: m.columnIndexB >= 0 ? (rowB[m.columnIndexB] ?? null) : null,
        })),
      });
    }

    if (i % 5000 === 0 && onProgress) {
      onProgress({
        phase: 'diffing',
        progress: 10 + (i / maxRows) * 70,
        message: `Comparing row ${i.toLocaleString()} of ${maxRows.toLocaleString()}...`,
      });
    }
  }

  return diffRows;
}

/**
 * Compare files by key column(s) - matching rows with the same key value.
 */
function compareByKey(
  fileA: ParsedFile,
  fileB: ParsedFile,
  config: ComparisonConfig,
  mappings: ColumnMapping[],
  onProgress?: (progress: CompareProgress) => void
): DiffRow[] {
  const keyColumnsA = config.keyColumns;
  const keyColumnsB = config.keyColumnsB.length > 0 ? config.keyColumnsB : config.keyColumns;
  
  if (keyColumnsA.length === 0) {
    return compareByPosition(fileA, fileB, config, mappings, onProgress);
  }

  // Build key maps using respective key columns
  const mapA = buildKeyMap(fileA.rows, keyColumnsA);
  const mapB = buildKeyMap(fileB.rows, keyColumnsB);

  const diffRows: DiffRow[] = [];
  const processedKeysB = new Set<string>();
  let processed = 0;
  const totalKeys = new Set([...mapA.keys(), ...mapB.keys()]).size;

  // Process rows from file A
  for (const [key, indicesA] of mapA.entries()) {
    const indicesB = mapB.get(key);
    
    if (indicesB) {
      processedKeysB.add(key);
      const rowA = fileA.rows[indicesA[0]];
      const rowB = fileB.rows[indicesB[0]];
      
      const cells = compareCellsMapped(rowA, rowB, mappings, config);
      const hasChanges = cells.some(c => c.status !== 'same');

      diffRows.push({
        id: `key_${key}`,
        status: hasChanges ? 'modified' : 'unchanged',
        lineNumberA: indicesA[0] + 1,
        lineNumberB: indicesB[0] + 1,
        keyValue: key,
        cells,
      });

      // Handle duplicate keys
      for (let i = 1; i < Math.max(indicesA.length, indicesB.length); i++) {
        const extraRowA = i < indicesA.length ? fileA.rows[indicesA[i]] : null;
        const extraRowB = i < indicesB.length ? fileB.rows[indicesB[i]] : null;

        if (extraRowA && extraRowB) {
          const extraCells = compareCellsMapped(extraRowA, extraRowB, mappings, config);
          const extraHasChanges = extraCells.some(c => c.status !== 'same');
          diffRows.push({
            id: `key_${key}_dup_${i}`,
            status: extraHasChanges ? 'modified' : 'unchanged',
            lineNumberA: indicesA[i] + 1,
            lineNumberB: indicesB[i] + 1,
            keyValue: key,
            cells: extraCells,
          });
        } else if (extraRowA) {
          diffRows.push({
            id: `key_${key}_rem_${i}`,
            status: 'removed',
            lineNumberA: indicesA[i] + 1,
            lineNumberB: null,
            keyValue: key,
            cells: mappings.map((m, idx) => ({
              columnIndex: idx,
              status: 'removed' as CellStatus,
              valueA: m.columnIndexA >= 0 ? (extraRowA[m.columnIndexA] ?? null) : null,
              valueB: null,
            })),
          });
        } else if (extraRowB) {
          diffRows.push({
            id: `key_${key}_add_${i}`,
            status: 'added',
            lineNumberA: null,
            lineNumberB: indicesB[i] + 1,
            keyValue: key,
            cells: mappings.map((m, idx) => ({
              columnIndex: idx,
              status: 'added' as CellStatus,
              valueA: null,
              valueB: m.columnIndexB >= 0 ? (extraRowB[m.columnIndexB] ?? null) : null,
            })),
          });
        }
      }
    } else {
      const rowA = fileA.rows[indicesA[0]];
      diffRows.push({
        id: `removed_${key}`,
        status: 'removed',
        lineNumberA: indicesA[0] + 1,
        lineNumberB: null,
        keyValue: key,
        cells: mappings.map((m, idx) => ({
          columnIndex: idx,
          status: 'removed' as CellStatus,
          valueA: m.columnIndexA >= 0 ? (rowA[m.columnIndexA] ?? null) : null,
          valueB: null,
        })),
      });
    }

    processed++;
    if (processed % 5000 === 0 && onProgress) {
      onProgress({
        phase: 'diffing',
        progress: 10 + (processed / totalKeys) * 70,
        message: `Comparing key ${processed.toLocaleString()} of ${totalKeys.toLocaleString()}...`,
      });
    }
  }

  // Process keys only in B (added rows)
  for (const [key, indicesB] of mapB.entries()) {
    if (processedKeysB.has(key)) continue;
    if (config.joinType === 'left') continue;
    if (config.joinType === 'inner') continue;

    const rowB = fileB.rows[indicesB[0]];
    diffRows.push({
      id: `added_${key}`,
      status: 'added',
      lineNumberA: null,
      lineNumberB: indicesB[0] + 1,
      keyValue: key,
      cells: mappings.map((m, idx) => ({
        columnIndex: idx,
        status: 'added' as CellStatus,
        valueA: null,
        valueB: m.columnIndexB >= 0 ? (rowB[m.columnIndexB] ?? null) : null,
      })),
    });
  }

  diffRows.sort((a, b) => {
    const lineA = a.lineNumberA || a.lineNumberB || 0;
    const lineB = b.lineNumberA || b.lineNumberB || 0;
    return lineA - lineB;
  });

  return diffRows;
}

/**
 * Compare files using fuzzy matching when no exact key exists.
 */
function compareByFuzzy(
  fileA: ParsedFile,
  fileB: ParsedFile,
  config: ComparisonConfig,
  mappings: ColumnMapping[],
  onProgress?: (progress: CompareProgress) => void
): DiffRow[] {
  const threshold = config.fuzzyThreshold;
  const diffRows: DiffRow[] = [];
  const matchedB = new Set<number>();

  for (let i = 0; i < fileA.rows.length; i++) {
    const rowA = fileA.rows[i];
    let bestMatch = -1;
    let bestScore = 0;

    for (let j = 0; j < fileB.rows.length; j++) {
      if (matchedB.has(j)) continue;
      const score = calculateRowSimilarityMapped(rowA, fileB.rows[j], mappings, config);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = j;
      }
    }

    if (bestScore >= threshold && bestMatch >= 0) {
      matchedB.add(bestMatch);
      const rowB = fileB.rows[bestMatch];
      const cells = compareCellsMapped(rowA, rowB, mappings, config);
      const hasChanges = cells.some(c => c.status !== 'same');

      diffRows.push({
        id: `fuzzy_${i}`,
        status: hasChanges ? 'modified' : 'unchanged',
        lineNumberA: i + 1,
        lineNumberB: bestMatch + 1,
        cells,
        similarityScore: bestScore,
      });
    } else {
      diffRows.push({
        id: `removed_${i}`,
        status: 'removed',
        lineNumberA: i + 1,
        lineNumberB: null,
        cells: mappings.map((m, idx) => ({
          columnIndex: idx,
          status: 'removed' as CellStatus,
          valueA: m.columnIndexA >= 0 ? (rowA[m.columnIndexA] ?? null) : null,
          valueB: null,
        })),
      });
    }

    if (i % 1000 === 0 && onProgress) {
      onProgress({
        phase: 'diffing',
        progress: 10 + (i / fileA.rows.length) * 60,
        message: `Fuzzy matching row ${i.toLocaleString()}...`,
      });
    }
  }

  for (let j = 0; j < fileB.rows.length; j++) {
    if (matchedB.has(j)) continue;
    const rowB = fileB.rows[j];
    diffRows.push({
      id: `added_${j}`,
      status: 'added',
      lineNumberA: null,
      lineNumberB: j + 1,
      cells: mappings.map((m, idx) => ({
        columnIndex: idx,
        status: 'added' as CellStatus,
        valueA: null,
        valueB: m.columnIndexB >= 0 ? (rowB[m.columnIndexB] ?? null) : null,
      })),
    });
  }

  return diffRows;
}

/**
 * Compare cells using column mappings - the core cell comparison with mapped columns.
 */
function compareCellsMapped(
  rowA: string[],
  rowB: string[],
  mappings: ColumnMapping[],
  config: ComparisonConfig
): DiffCell[] {
  const cells: DiffCell[] = [];

  for (let idx = 0; idx < mappings.length; idx++) {
    const mapping = mappings[idx];

    // Skip ignored columns
    if (config.ignoreColumns.includes(idx)) {
      cells.push({
        columnIndex: idx,
        status: 'same',
        valueA: mapping.columnIndexA >= 0 ? (rowA[mapping.columnIndexA] ?? null) : null,
        valueB: mapping.columnIndexB >= 0 ? (rowB[mapping.columnIndexB] ?? null) : null,
      });
      continue;
    }

    const valA = mapping.columnIndexA >= 0 ? (rowA[mapping.columnIndexA] ?? null) : null;
    const valB = mapping.columnIndexB >= 0 ? (rowB[mapping.columnIndexB] ?? null) : null;

    if (valA === null && valB !== null) {
      cells.push({ columnIndex: idx, status: 'added', valueA: null, valueB: valB });
    } else if (valA !== null && valB === null) {
      cells.push({ columnIndex: idx, status: 'removed', valueA: valA, valueB: null });
    } else if (valA !== null && valB !== null) {
      const areEqual = cellsAreEqual(valA, valB, config);
      if (areEqual) {
        cells.push({ columnIndex: idx, status: 'same', valueA: valA, valueB: valB });
      } else {
        cells.push({
          columnIndex: idx,
          status: 'changed',
          valueA: valA,
          valueB: valB,
          charDiffs: computeCharDiff(valA, valB),
        });
      }
    } else {
      cells.push({ columnIndex: idx, status: 'same', valueA: null, valueB: null });
    }
  }

  return cells;
}

/**
 * Compare individual cells between two rows (legacy, used for old comparisons without mapping).
 */
function compareCells(
  rowA: string[],
  rowB: string[],
  config: ComparisonConfig
): DiffCell[] {
  const maxCols = Math.max(rowA.length, rowB.length);
  const cells: DiffCell[] = [];

  for (let col = 0; col < maxCols; col++) {
    // Skip ignored columns
    if (config.ignoreColumns.includes(col)) {
      cells.push({
        columnIndex: col,
        status: 'same',
        valueA: col < rowA.length ? rowA[col] : null,
        valueB: col < rowB.length ? rowB[col] : null,
      });
      continue;
    }

    const valA = col < rowA.length ? rowA[col] : null;
    const valB = col < rowB.length ? rowB[col] : null;

    if (valA === null && valB !== null) {
      cells.push({ columnIndex: col, status: 'added', valueA: null, valueB: valB });
    } else if (valA !== null && valB === null) {
      cells.push({ columnIndex: col, status: 'removed', valueA: valA, valueB: null });
    } else if (valA !== null && valB !== null) {
      const areEqual = cellsAreEqual(valA, valB, config);
      if (areEqual) {
        cells.push({ columnIndex: col, status: 'same', valueA: valA, valueB: valB });
      } else {
        cells.push({
          columnIndex: col,
          status: 'changed',
          valueA: valA,
          valueB: valB,
          charDiffs: computeCharDiff(valA, valB),
        });
      }
    } else {
      cells.push({ columnIndex: col, status: 'same', valueA: null, valueB: null });
    }
  }

  return cells;
}

/**
 * Determine if two cell values are equal given comparison config.
 */
function cellsAreEqual(valA: string, valB: string, config: ComparisonConfig): boolean {
  let a = valA;
  let b = valB;

  // Apply transformations before comparison
  if (config.trimBeforeCompare) {
    a = a.trim();
    b = b.trim();
  }

  if (config.ignoreWhitespace) {
    a = a.replace(/\s+/g, ' ').trim();
    b = b.replace(/\s+/g, ' ').trim();
  }

  if (!config.caseSensitive) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }

  if (config.treatEmptyAsNull) {
    if (a === '') a = '<NULL>';
    if (b === '') b = '<NULL>';
  }

  // Numeric tolerance check
  if (config.numericTolerance > 0) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return Math.abs(numA - numB) <= config.numericTolerance;
    }
  }

  return a === b;
}

/**
 * Compute character-level diff between two strings using LCS-based algorithm.
 */
export function computeCharDiff(oldStr: string, newStr: string): CharDiff[] {
  if (oldStr === newStr) {
    return [{ value: oldStr, type: 'same' }];
  }

  if (oldStr.length === 0) {
    return [{ value: newStr, type: 'added' }];
  }

  if (newStr.length === 0) {
    return [{ value: oldStr, type: 'removed' }];
  }

  // Simple diff algorithm for short strings
  // For very long strings, use a simpler approach
  if (oldStr.length > 500 || newStr.length > 500) {
    return [
      { value: oldStr, type: 'removed' },
      { value: newStr, type: 'added' },
    ];
  }

  // Myers-like character diff
  const result: CharDiff[] = [];
  const lcs = longestCommonSubsequence(oldStr, newStr);
  
  let oldIdx = 0;
  let newIdx = 0;
  
  for (const commonChar of lcs) {
    // Characters removed from old (before the common char)
    let removedChars = '';
    while (oldIdx < oldStr.length && oldStr[oldIdx] !== commonChar) {
      removedChars += oldStr[oldIdx];
      oldIdx++;
    }
    if (removedChars) {
      result.push({ value: removedChars, type: 'removed' });
    }

    // Characters added in new (before the common char)
    let addedChars = '';
    while (newIdx < newStr.length && newStr[newIdx] !== commonChar) {
      addedChars += newStr[newIdx];
      newIdx++;
    }
    if (addedChars) {
      result.push({ value: addedChars, type: 'added' });
    }

    // Common character
    result.push({ value: commonChar, type: 'same' });
    oldIdx++;
    newIdx++;
  }

  // Remaining characters
  if (oldIdx < oldStr.length) {
    result.push({ value: oldStr.substring(oldIdx), type: 'removed' });
  }
  if (newIdx < newStr.length) {
    result.push({ value: newStr.substring(newIdx), type: 'added' });
  }

  // Merge consecutive same-type diffs
  return mergeDiffs(result);
}

/**
 * Compute Longest Common Subsequence of two strings.
 */
function longestCommonSubsequence(a: string, b: string): string {
  const m = a.length;
  const n = b.length;
  
  // Use space-optimized LCS
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);

  // Build LCS length table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS string
  let lcs = '';
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs = a[i - 1] + lcs;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Merge consecutive CharDiff entries with the same type.
 */
function mergeDiffs(diffs: CharDiff[]): CharDiff[] {
  if (diffs.length === 0) return diffs;

  const merged: CharDiff[] = [diffs[0]];
  
  for (let i = 1; i < diffs.length; i++) {
    const last = merged[merged.length - 1];
    if (last.type === diffs[i].type) {
      last.value += diffs[i].value;
    } else {
      merged.push({ ...diffs[i] });
    }
  }

  return merged;
}

/**
 * Calculate similarity score between two rows using column mappings (0-1).
 */
function calculateRowSimilarityMapped(
  rowA: string[],
  rowB: string[],
  mappings: ColumnMapping[],
  config: ComparisonConfig
): number {
  if (mappings.length === 0) return 0;
  let matchingCells = 0;

  for (let idx = 0; idx < mappings.length; idx++) {
    if (config.ignoreColumns.includes(idx)) { matchingCells++; continue; }
    const m = mappings[idx];
    const valA = m.columnIndexA >= 0 ? (rowA[m.columnIndexA] ?? '') : '';
    const valB = m.columnIndexB >= 0 ? (rowB[m.columnIndexB] ?? '') : '';
    if (cellsAreEqual(valA, valB, config)) { matchingCells++; }
    else { matchingCells += levenshteinSimilarity(valA, valB); }
  }
  return matchingCells / mappings.length;
}

/**
 * Calculate similarity score between two rows (0-1).
 */
function calculateRowSimilarity(rowA: string[], rowB: string[], config: ComparisonConfig): number {
  const maxCols = Math.max(rowA.length, rowB.length);
  if (maxCols === 0) return 1;

  let matchingCells = 0;

  for (let col = 0; col < maxCols; col++) {
    if (config.ignoreColumns.includes(col)) {
      matchingCells++;
      continue;
    }

    const valA = col < rowA.length ? rowA[col] : '';
    const valB = col < rowB.length ? rowB[col] : '';

    if (cellsAreEqual(valA, valB, config)) {
      matchingCells++;
    } else {
      // Partial credit based on string similarity
      matchingCells += levenshteinSimilarity(valA, valB);
    }
  }

  return matchingCells / maxCols;
}

/**
 * Calculate Levenshtein-based similarity between two strings (0-1).
 */
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const maxLen = Math.max(a.length, b.length);
  
  // For very long strings, use a quick approximation
  if (maxLen > 100) {
    const commonPrefix = getCommonPrefixLength(a, b);
    const commonSuffix = getCommonSuffixLength(a, b, commonPrefix);
    return (commonPrefix + commonSuffix) / maxLen;
  }

  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }

  return dp[n];
}

function getCommonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function getCommonSuffixLength(a: string, b: string, prefixLen: number): number {
  let i = 0;
  while (
    i < a.length - prefixLen &&
    i < b.length - prefixLen &&
    a[a.length - 1 - i] === b[b.length - 1 - i]
  ) {
    i++;
  }
  return i;
}

/**
 * Build a map from key values to row indices.
 */
function buildKeyMap(rows: string[][], keyColumns: number[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  
  for (let i = 0; i < rows.length; i++) {
    const key = keyColumns.map(col => rows[i][col] || '').join('||');
    const existing = map.get(key);
    if (existing) {
      existing.push(i);
    } else {
      map.set(key, [i]);
    }
  }

  return map;
}

/**
 * Compute per-column statistics from diff results.
 */
function computeColumnStats(
  diffRows: DiffRow[],
  headersA: string[],
  headersB: string[],
  mappings: ColumnMapping[]
): ColumnStat[] {
  const stats: ColumnStat[] = [];

  for (let idx = 0; idx < mappings.length; idx++) {
    const m = mappings[idx];
    let totalCells = 0;
    let changedCells = 0;
    let addedCells = 0;
    let removedCells = 0;

    for (const row of diffRows) {
      const cell = row.cells[idx];
      if (!cell) continue;
      totalCells++;
      switch (cell.status) {
        case 'changed': changedCells++; break;
        case 'added': addedCells++; break;
        case 'removed': removedCells++; break;
      }
    }

    const colName = m.headerA || m.headerB || `Column ${idx + 1}`;
    stats.push({
      columnIndex: idx,
      columnName: colName,
      totalCells,
      changedCells,
      addedCells,
      removedCells,
      changePercentage: totalCells > 0 ? ((changedCells + addedCells + removedCells) / totalCells) * 100 : 0,
    });
  }

  return stats;
}
