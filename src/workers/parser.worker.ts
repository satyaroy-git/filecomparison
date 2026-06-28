import * as Comlink from 'comlink';
import Papa from 'papaparse';
import type {
  DelimitedConfig,
  FixedWidthConfig,
  ParsedFile,
  ParseError,
  FileInfo,
  ParseProgress,
  FixedWidthField,
  TrimMode,
} from '@/types';
import { detectDelimiter, detectHeader } from '@/core/delimiter-detector';

/**
 * Parser Worker API - runs file parsing off the main thread.
 */
const parserWorkerApi = {
  /**
   * Parse a delimited file from raw text content.
   */
  async parseDelimited(
    text: string,
    fileName: string,
    fileSize: number,
    fileLastModified: number,
    config: DelimitedConfig,
    onProgress?: (progress: ParseProgress) => void
  ): Promise<ParsedFile> {
    onProgress?.({ phase: 'parsing', progress: 5, message: 'Detecting format...' });

    // Auto-detect delimiter
    let effectiveDelimiter = config.delimiter === 'custom'
      ? (config.customDelimiter || ',')
      : config.delimiter;

    const detection = detectDelimiter(text.substring(0, 10000));
    if (detection.confidence > 0.5 && config.delimiter === ',') {
      effectiveDelimiter = detection.delimiter === 'custom'
        ? (detection.customDelimiter || ',')
        : detection.delimiter;
    }

    // Auto-detect header
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const hasHeader = config.hasHeader !== undefined
      ? config.hasHeader
      : detectHeader(lines, effectiveDelimiter);

    onProgress?.({ phase: 'parsing', progress: 15, message: 'Parsing rows...' });

    const parseErrors: ParseError[] = [];
    const rows: string[][] = [];
    let headers: string[] = [];
    let rowCount = 0;

    // Parse using PapaParse
    const result = Papa.parse(text, {
      delimiter: effectiveDelimiter,
      header: false,
      quoteChar: config.quoteChar || '"',
      escapeChar: config.escapeChar || '"',
      comments: config.commentChar || false,
      skipEmptyLines: config.skipEmptyLines,
    });

    const allRows = result.data as string[][];

    // Process header
    if (hasHeader && allRows.length > 0) {
      headers = allRows[0].map(h => h.trim());
      allRows.shift();
    }

    // Process data rows with progress
    const totalRows = allRows.length;
    for (let i = 0; i < totalRows; i++) {
      const row = config.trimFields
        ? allRows[i].map(cell => cell.trim())
        : allRows[i];
      rows.push(row);

      if (i % 10000 === 0) {
        const progress = 15 + (i / totalRows) * 75;
        onProgress?.({
          phase: 'parsing',
          progress: Math.min(progress, 90),
          rowsParsed: i,
          message: `Parsed ${i.toLocaleString()} of ${totalRows.toLocaleString()} rows...`,
        });
      }
    }

    // Track parse errors
    if (result.errors && result.errors.length > 0) {
      for (const err of result.errors) {
        parseErrors.push({
          row: err.row || 0,
          message: err.message,
          type: 'error',
        });
      }
    }

    // Generate headers if not present
    if (headers.length === 0) {
      const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
      headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
    }

    // Normalize row lengths
    const normalizedRows = rows.map((row, idx) => {
      if (row.length < headers.length) {
        return [...row, ...Array(headers.length - row.length).fill('')];
      }
      if (row.length > headers.length) {
        parseErrors.push({
          row: idx,
          message: `Row has ${row.length} columns, expected ${headers.length}`,
          type: 'warning',
        });
        return row.slice(0, headers.length);
      }
      return row;
    });

    const fileInfo: FileInfo = {
      name: fileName,
      size: fileSize,
      lastModified: fileLastModified,
      encoding: config.encoding,
      lineCount: normalizedRows.length,
      format: 'delimited',
    };

    onProgress?.({ phase: 'complete', progress: 100, message: 'Parsing complete' });

    return {
      fileInfo,
      headers,
      rows: normalizedRows,
      totalRows: normalizedRows.length,
      parseErrors,
      config: { ...config, delimiter: effectiveDelimiter as DelimitedConfig['delimiter'] },
    };
  },

  /**
   * Parse a fixed-width file from raw text content.
   */
  async parseFixedWidth(
    text: string,
    fileName: string,
    fileSize: number,
    fileLastModified: number,
    config: FixedWidthConfig,
    onProgress?: (progress: ParseProgress) => void
  ): Promise<ParsedFile> {
    onProgress?.({ phase: 'parsing', progress: 5, message: 'Parsing fixed-width data...' });

    if (config.fields.length === 0) {
      throw new Error('No field definitions provided. Please define column positions.');
    }

    const lines = splitLines(text, config.lineEnding, config.skipEmptyLines);
    const parseErrors: ParseError[] = [];
    const rows: string[][] = [];
    const headers = config.fields.map(f => f.name);
    const startIdx = config.hasHeader ? 1 : 0;

    const expectedLength = config.recordLength ||
      Math.max(...config.fields.map(f => f.startPosition + f.length));

    const totalLines = lines.length - startIdx;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];

      if (line.length < expectedLength) {
        parseErrors.push({
          row: i,
          message: `Line ${i + 1}: Expected length ${expectedLength}, got ${line.length}`,
          type: 'warning',
        });
      }

      const row = extractFieldsFromLine(line, config.fields);
      rows.push(row);

      if ((i - startIdx) % 10000 === 0) {
        const progress = 5 + ((i - startIdx) / totalLines) * 85;
        onProgress?.({
          phase: 'parsing',
          progress: Math.min(progress, 90),
          rowsParsed: i - startIdx,
          message: `Parsed ${(i - startIdx).toLocaleString()} of ${totalLines.toLocaleString()} rows...`,
        });
      }
    }

    const fileInfo: FileInfo = {
      name: fileName,
      size: fileSize,
      lastModified: fileLastModified,
      encoding: config.encoding,
      lineCount: rows.length,
      format: 'fixed-width',
    };

    onProgress?.({ phase: 'complete', progress: 100, message: 'Parsing complete' });

    return {
      fileInfo,
      headers,
      rows,
      totalRows: rows.length,
      parseErrors,
      config,
    };
  },
};

// ===== Helper Functions =====

function extractFieldsFromLine(line: string, fields: FixedWidthField[]): string[] {
  return fields.map(field => {
    const start = field.startPosition;
    const end = start + field.length;
    if (start >= line.length) return '';
    const rawValue = line.substring(start, Math.min(end, line.length));
    return applyTrim(rawValue, field.trimMode);
  });
}

function applyTrim(value: string, trimMode: TrimMode): string {
  switch (trimMode) {
    case 'left': return value.replace(/^\s+/, '');
    case 'right': return value.replace(/\s+$/, '');
    case 'both': return value.trim();
    case 'none':
    default: return value;
  }
}

function splitLines(text: string, lineEnding: string, skipEmpty: boolean): string[] {
  let separator: RegExp;
  switch (lineEnding) {
    case 'crlf': separator = /\r\n/; break;
    case 'lf': separator = /\n/; break;
    case 'cr': separator = /\r/; break;
    case 'auto':
    default: separator = /\r?\n/; break;
  }
  const lines = text.split(separator);
  return skipEmpty ? lines.filter(l => l.length > 0) : lines;
}

Comlink.expose(parserWorkerApi);

export type ParserWorkerApi = typeof parserWorkerApi;
