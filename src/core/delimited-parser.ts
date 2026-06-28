import Papa from 'papaparse';
import type {
  DelimitedConfig,
  ParsedFile,
  ParseError,
  FileInfo,
  ParseProgress,
} from '@/types';
import { detectDelimiter, detectHeader } from './delimiter-detector';

/**
 * Parse a delimited file (CSV, TSV, pipe-separated, etc.)
 * Uses PapaParse for robust handling of quoted fields, multi-line values, etc.
 */
export async function parseDelimitedFile(
  file: File,
  config: DelimitedConfig,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParsedFile> {
  onProgress?.({ phase: 'reading', progress: 0, message: 'Reading file...' });

  const text = await readFileAsText(file, config.encoding);
  
  onProgress?.({ phase: 'parsing', progress: 10, message: 'Detecting format...' });

  // Auto-detect delimiter if needed
  let effectiveDelimiter = config.delimiter === 'custom' 
    ? (config.customDelimiter || ',')
    : config.delimiter;

  // If we need to auto-detect
  if (!effectiveDelimiter || effectiveDelimiter === ',') {
    const detection = detectDelimiter(text.substring(0, 10000));
    if (detection.confidence > 0.5) {
      effectiveDelimiter = detection.delimiter === 'custom'
        ? (detection.customDelimiter || ',')
        : detection.delimiter;
    }
  }

  // Auto-detect header
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const hasHeader = config.hasHeader !== undefined 
    ? config.hasHeader 
    : detectHeader(lines, effectiveDelimiter);

  onProgress?.({ phase: 'parsing', progress: 30, message: 'Parsing data...' });

  return new Promise((resolve, reject) => {
    const parseErrors: ParseError[] = [];
    const rows: string[][] = [];
    let headers: string[] = [];
    let rowCount = 0;

    Papa.parse(text, {
      delimiter: effectiveDelimiter,
      header: false,
      quoteChar: config.quoteChar || '"',
      escapeChar: config.escapeChar || '"',
      comments: config.commentChar || false,
      skipEmptyLines: config.skipEmptyLines,
      transformHeader: undefined,
      step: (results) => {
        const row = results.data as string[];
        
        if (rowCount === 0 && hasHeader) {
          headers = row.map(h => h.trim());
        } else {
          // Apply trimming if configured
          const processedRow = config.trimFields 
            ? row.map(cell => cell.trim())
            : row;
          rows.push(processedRow);
        }
        
        rowCount++;

        // Report progress every 10000 rows
        if (rowCount % 10000 === 0) {
          const progress = Math.min(30 + (rowCount / lines.length) * 60, 90);
          onProgress?.({
            phase: 'parsing',
            progress,
            rowsParsed: rowCount,
            message: `Parsed ${rowCount.toLocaleString()} rows...`,
          });
        }
      },
      error: (error: Error) => {
        parseErrors.push({
          row: rowCount,
          message: error.message,
          type: 'error',
        });
      },
      complete: () => {
        // Generate column headers if no header row
        if (!hasHeader || headers.length === 0) {
          const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
          headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
        }

        // Normalize row lengths to match header count
        const normalizedRows = rows.map(row => {
          if (row.length < headers.length) {
            return [...row, ...Array(headers.length - row.length).fill('')];
          }
          if (row.length > headers.length) {
            // Track extra columns as a warning
            parseErrors.push({
              row: rows.indexOf(row),
              message: `Row has ${row.length} columns, expected ${headers.length}`,
              type: 'warning',
            });
            return row.slice(0, headers.length);
          }
          return row;
        });

        const fileInfo: FileInfo = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          encoding: config.encoding,
          lineCount: normalizedRows.length,
          format: 'delimited',
        };

        onProgress?.({ phase: 'complete', progress: 100, message: 'Parsing complete' });

        resolve({
          fileInfo,
          headers,
          rows: normalizedRows,
          totalRows: normalizedRows.length,
          parseErrors,
          config: { ...config, delimiter: effectiveDelimiter as DelimitedConfig['delimiter'] },
        });
      },
    });
  });
}

/**
 * Parse a delimited file in streaming chunks for very large files.
 * Yields parsed rows in batches.
 */
export async function* parseDelimitedFileStreaming(
  file: File,
  config: DelimitedConfig,
  batchSize: number = 10000
): AsyncGenerator<{ headers?: string[]; rows: string[][]; done: boolean }> {
  const text = await readFileAsText(file, config.encoding);
  
  const effectiveDelimiter = config.delimiter === 'custom'
    ? (config.customDelimiter || ',')
    : config.delimiter;

  let headers: string[] | undefined;
  let batch: string[][] = [];
  let isFirstRow = true;

  const lines = text.split(/\r?\n/);
  
  for (const line of lines) {
    if (config.skipEmptyLines && line.trim() === '') continue;

    const parsed = Papa.parse(line, {
      delimiter: effectiveDelimiter,
      quoteChar: config.quoteChar || '"',
      escapeChar: config.escapeChar || '"',
    });

    const row = parsed.data[0] as string[];
    if (!row) continue;

    if (isFirstRow && config.hasHeader) {
      headers = row.map(h => h.trim());
      isFirstRow = false;
      continue;
    }

    isFirstRow = false;
    const processedRow = config.trimFields ? row.map(c => c.trim()) : row;
    batch.push(processedRow);

    if (batch.length >= batchSize) {
      yield { headers, rows: batch, done: false };
      batch = [];
    }
  }

  if (batch.length > 0) {
    yield { headers, rows: batch, done: true };
  } else {
    yield { headers, rows: [], done: true };
  }
}

/**
 * Read file content as text with specified encoding.
 */
function readFileAsText(file: File, encoding: string = 'utf-8'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${reader.error?.message}`));
    reader.readAsText(file, encoding);
  });
}

/**
 * Quick preview: parse only the first N rows for preview purposes.
 */
export async function previewDelimitedFile(
  file: File,
  config: DelimitedConfig,
  maxRows: number = 100
): Promise<{ headers: string[]; rows: string[][]; totalLines: number }> {
  const text = await readFileAsText(file, config.encoding);
  const lines = text.split(/\r?\n/);
  const totalLines = lines.filter(l => l.trim().length > 0).length;

  // Take only what we need for preview
  const previewText = lines.slice(0, maxRows + 1).join('\n');

  const effectiveDelimiter = config.delimiter === 'custom'
    ? (config.customDelimiter || ',')
    : config.delimiter;

  const result = Papa.parse(previewText, {
    delimiter: effectiveDelimiter,
    header: false,
    quoteChar: config.quoteChar || '"',
    escapeChar: config.escapeChar || '"',
    skipEmptyLines: config.skipEmptyLines,
  });

  const allRows = result.data as string[][];
  let headers: string[];
  let rows: string[][];

  if (config.hasHeader && allRows.length > 0) {
    headers = allRows[0].map(h => h.trim());
    rows = allRows.slice(1, maxRows + 1);
  } else {
    const maxCols = allRows.reduce((max, row) => Math.max(max, row.length), 0);
    headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
    rows = allRows.slice(0, maxRows);
  }

  return { headers, rows, totalLines };
}
