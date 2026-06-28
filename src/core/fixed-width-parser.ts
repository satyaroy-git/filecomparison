import type {
  FixedWidthConfig,
  FixedWidthField,
  FixedWidthSchema,
  ParsedFile,
  ParseError,
  FileInfo,
  ParseProgress,
  ColumnBoundary,
  ColumnDetectionResult,
  TrimMode,
} from '@/types';

/**
 * Parse a fixed-width file using defined field positions and lengths.
 */
export async function parseFixedWidthFile(
  file: File,
  config: FixedWidthConfig,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParsedFile> {
  onProgress?.({ phase: 'reading', progress: 0, message: 'Reading file...' });

  const text = await readFileAsText(file, config.encoding);
  const lines = splitLines(text, config.lineEnding, config.skipEmptyLines);

  onProgress?.({ phase: 'parsing', progress: 10, message: 'Parsing fixed-width data...' });

  if (config.fields.length === 0) {
    throw new Error('No field definitions provided. Please define column positions.');
  }

  const parseErrors: ParseError[] = [];
  const rows: string[][] = [];
  let headers: string[] = config.fields.map(f => f.name);
  const startIdx = config.hasHeader ? 1 : 0;

  // Determine expected record length
  const expectedLength = config.recordLength || 
    Math.max(...config.fields.map(f => f.startPosition + f.length));

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // Validate record length
    if (line.length < expectedLength) {
      parseErrors.push({
        row: i,
        message: `Line ${i + 1}: Expected length ${expectedLength}, got ${line.length}. Padding with spaces.`,
        type: 'warning',
      });
    }

    const row = extractFieldsFromLine(line, config.fields);
    rows.push(row);

    // Report progress every 10000 rows
    if (i % 10000 === 0) {
      const progress = Math.min(10 + (i / lines.length) * 80, 90);
      onProgress?.({
        phase: 'parsing',
        progress,
        rowsParsed: i,
        message: `Parsed ${i.toLocaleString()} rows...`,
      });
    }
  }

  // If file has a header row, use it for column names (but still use field definitions for parsing)
  if (config.hasHeader && lines.length > 0) {
    const headerRow = extractFieldsFromLine(lines[0], config.fields);
    // Only use header values if they look like valid header names
    const looksLikeHeaders = headerRow.every(h => /^[a-zA-Z_\s]/.test(h.trim()));
    if (looksLikeHeaders) {
      headers = headerRow.map(h => h.trim());
    }
  }

  const fileInfo: FileInfo = {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
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
}

/**
 * Extract field values from a single line using field definitions.
 */
function extractFieldsFromLine(line: string, fields: FixedWidthField[]): string[] {
  return fields.map(field => {
    const start = field.startPosition;
    const end = start + field.length;
    
    // Handle lines shorter than expected
    if (start >= line.length) {
      return '';
    }
    
    const rawValue = line.substring(start, Math.min(end, line.length));
    return applyTrim(rawValue, field.trimMode);
  });
}

/**
 * Apply trim mode to a field value.
 */
function applyTrim(value: string, trimMode: TrimMode): string {
  switch (trimMode) {
    case 'left':
      return value.replace(/^\s+/, '');
    case 'right':
      return value.replace(/\s+$/, '');
    case 'both':
      return value.trim();
    case 'none':
    default:
      return value;
  }
}

/**
 * Auto-detect column boundaries in a fixed-width file.
 * 
 * Strategy: Analyze character patterns across multiple rows to find
 * consistent space/separator positions that indicate column boundaries.
 */
export function detectFixedWidthColumns(sampleText: string): ColumnDetectionResult {
  const lines = sampleText.split(/\r?\n/).filter(l => l.length > 0);
  
  if (lines.length === 0) {
    return { boundaries: [], recordLength: 0, confidence: 0 };
  }

  // Use a representative sample
  const sampleLines = lines.slice(0, Math.min(100, lines.length));
  
  // Find the most common line length (record length)
  const lengthCounts: Record<number, number> = {};
  for (const line of sampleLines) {
    lengthCounts[line.length] = (lengthCounts[line.length] || 0) + 1;
  }
  const recordLength = Number(
    Object.entries(lengthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 0
  );

  if (recordLength === 0) {
    return { boundaries: [], recordLength: 0, confidence: 0 };
  }

  // Method 1: Space frequency analysis
  // For each character position, count how often it's a space
  const spaceFrequency = new Array(recordLength).fill(0);
  const charTypeTransitions = new Array(recordLength).fill(0);

  for (const line of sampleLines) {
    for (let pos = 0; pos < Math.min(line.length, recordLength); pos++) {
      if (line[pos] === ' ') {
        spaceFrequency[pos]++;
      }
      // Track transitions from non-space to space
      if (pos > 0 && line[pos] === ' ' && line[pos - 1] !== ' ') {
        charTypeTransitions[pos]++;
      }
    }
  }

  // Normalize frequencies
  const normalizedSpaceFreq = spaceFrequency.map(f => f / sampleLines.length);

  // Method 2: Find positions where space frequency drops sharply (field starts)
  // A column boundary is where we transition from high-space to low-space
  const boundaries: ColumnBoundary[] = [];
  let currentStart = 0;

  // Find column boundaries using "gap detection"
  // A gap is a position (or consecutive positions) with high space frequency
  const SPACE_THRESHOLD = 0.7; // 70% of lines have a space here
  
  let inGap = false;
  let gapStart = 0;

  for (let pos = 0; pos < recordLength; pos++) {
    if (normalizedSpaceFreq[pos] >= SPACE_THRESHOLD && !inGap) {
      // Entering a gap - mark end of previous field
      inGap = true;
      gapStart = pos;
      
      if (pos > currentStart) {
        boundaries.push({
          startPosition: currentStart,
          endPosition: pos,
          confidence: normalizedSpaceFreq[pos],
        });
      }
    } else if (normalizedSpaceFreq[pos] < SPACE_THRESHOLD && inGap) {
      // Exiting a gap - mark start of new field
      inGap = false;
      currentStart = pos;
    }
  }

  // Add the last field
  if (currentStart < recordLength) {
    boundaries.push({
      startPosition: currentStart,
      endPosition: recordLength,
      confidence: 0.8,
    });
  }

  // If gap detection doesn't work well (e.g., packed data), try transition-based detection
  if (boundaries.length <= 1) {
    return detectByTransitions(sampleLines, recordLength);
  }

  // Infer data types for each detected column
  const enrichedBoundaries = boundaries.map(boundary => ({
    ...boundary,
    suggestedName: `Field_${boundary.startPosition + 1}`,
    suggestedType: inferFieldDataType(sampleLines, boundary.startPosition, boundary.endPosition),
  }));

  const avgConfidence = enrichedBoundaries.reduce((sum, b) => sum + b.confidence, 0) / enrichedBoundaries.length;

  return {
    boundaries: enrichedBoundaries,
    recordLength,
    confidence: Math.min(avgConfidence, 1),
  };
}

/**
 * Alternative detection using character type transitions.
 * Useful for packed fixed-width files without clear space gaps.
 */
function detectByTransitions(lines: string[], recordLength: number): ColumnDetectionResult {
  // Analyze transitions between data types at each position
  const typeChanges = new Array(recordLength).fill(0);
  
  for (const line of lines) {
    for (let pos = 1; pos < Math.min(line.length, recordLength); pos++) {
      const prevType = getCharType(line[pos - 1]);
      const currType = getCharType(line[pos]);
      
      if (prevType !== currType) {
        typeChanges[pos]++;
      }
    }
  }

  // Normalize and find peaks (consistent type changes = field boundaries)
  const threshold = lines.length * 0.5;
  const boundaries: ColumnBoundary[] = [];
  let currentStart = 0;

  for (let pos = 1; pos < recordLength; pos++) {
    if (typeChanges[pos] >= threshold) {
      boundaries.push({
        startPosition: currentStart,
        endPosition: pos,
        confidence: typeChanges[pos] / lines.length,
      });
      currentStart = pos;
    }
  }

  // Add the last field
  if (currentStart < recordLength) {
    boundaries.push({
      startPosition: currentStart,
      endPosition: recordLength,
      confidence: 0.6,
    });
  }

  return {
    boundaries,
    recordLength,
    confidence: boundaries.length > 1 ? 0.5 : 0.2,
  };
}

/**
 * Classify a character into a type category.
 */
function getCharType(char: string): 'alpha' | 'digit' | 'space' | 'special' {
  if (/[a-zA-Z]/.test(char)) return 'alpha';
  if (/[0-9]/.test(char)) return 'digit';
  if (char === ' ') return 'space';
  return 'special';
}

/**
 * Infer the data type of a field based on sample values.
 */
function inferFieldDataType(
  lines: string[],
  startPos: number,
  endPos: number
): 'string' | 'numeric' | 'date' | 'boolean' {
  const values = lines
    .map(line => line.substring(startPos, Math.min(endPos, line.length)).trim())
    .filter(v => v.length > 0);

  if (values.length === 0) return 'string';

  // Check if all values are numeric
  const numericCount = values.filter(v => /^-?\d*\.?\d+$/.test(v)).length;
  if (numericCount / values.length > 0.8) return 'numeric';

  // Check if values look like dates
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{2}-\d{2}-\d{4}$/,
    /^\d{8}$/,
  ];
  const dateCount = values.filter(v => datePatterns.some(p => p.test(v))).length;
  if (dateCount / values.length > 0.8) return 'date';

  // Check if values are boolean-like
  const boolValues = new Set(['Y', 'N', 'T', 'F', '0', '1', 'YES', 'NO', 'TRUE', 'FALSE']);
  const boolCount = values.filter(v => boolValues.has(v.toUpperCase())).length;
  if (boolCount / values.length > 0.8) return 'boolean';

  return 'string';
}

/**
 * Quick preview of a fixed-width file (first N rows).
 */
export async function previewFixedWidthFile(
  file: File,
  config: FixedWidthConfig,
  maxRows: number = 50
): Promise<{ headers: string[]; rows: string[][]; totalLines: number; rawLines: string[] }> {
  const text = await readFileAsText(file, config.encoding);
  const allLines = splitLines(text, config.lineEnding, config.skipEmptyLines);
  const totalLines = allLines.length;

  const previewLines = allLines.slice(0, maxRows + (config.hasHeader ? 1 : 0));
  
  if (config.fields.length === 0) {
    // Return raw lines for the layout builder
    return {
      headers: [],
      rows: [],
      totalLines,
      rawLines: previewLines,
    };
  }

  const headers = config.fields.map(f => f.name);
  const startIdx = config.hasHeader ? 1 : 0;
  const rows = previewLines.slice(startIdx).map(line => 
    extractFieldsFromLine(line, config.fields)
  );

  return { headers, rows, totalLines, rawLines: previewLines };
}

/**
 * Convert detected column boundaries to field definitions.
 */
export function boundariesToFields(boundaries: ColumnBoundary[]): FixedWidthField[] {
  return boundaries.map((boundary, index) => ({
    id: `field_${index}`,
    name: boundary.suggestedName || `Field_${index + 1}`,
    startPosition: boundary.startPosition,
    length: boundary.endPosition - boundary.startPosition,
    dataType: boundary.suggestedType || 'string',
    trimMode: 'both' as TrimMode,
    description: '',
  }));
}

/**
 * Import a fixed-width schema from JSON format.
 */
export function importSchema(schemaJson: string): FixedWidthSchema {
  try {
    const schema = JSON.parse(schemaJson) as FixedWidthSchema;
    
    // Validate required fields
    if (!schema.fields || !Array.isArray(schema.fields)) {
      throw new Error('Schema must contain a "fields" array');
    }
    
    for (const field of schema.fields) {
      if (typeof field.startPosition !== 'number' || typeof field.length !== 'number') {
        throw new Error(`Field "${field.name}" must have startPosition and length as numbers`);
      }
      if (!field.name || typeof field.name !== 'string') {
        throw new Error('All fields must have a "name" string property');
      }
    }

    return schema;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw e;
  }
}

/**
 * Export field definitions as a reusable schema.
 */
export function exportSchema(
  name: string,
  fields: FixedWidthField[],
  recordLength: number,
  description?: string
): string {
  const schema: FixedWidthSchema = {
    name,
    description,
    recordLength,
    fields,
    version: '1.0',
    createdAt: new Date().toISOString(),
  };
  return JSON.stringify(schema, null, 2);
}

/**
 * Parse a simple COBOL-like copybook layout definition.
 * Supports basic format:
 *   01 RECORD.
 *     05 FIELD-NAME  PIC X(10).
 *     05 AMOUNT      PIC 9(7)V99.
 * 
 * This is a simplified parser for common patterns.
 */
export function parseCopybookLayout(copybook: string): FixedWidthField[] {
  const fields: FixedWidthField[] = [];
  const lines = copybook.split(/\r?\n/);
  let currentPosition = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('*')) continue;

    // Match: level FIELD-NAME PIC clause
    const match = trimmed.match(
      /(\d{2})\s+([A-Za-z0-9_-]+)\s+PIC\s+([X9A]+\(\d+\)(?:V\d+)?|[X9A]+)/i
    );

    if (match) {
      const [, , fieldName, picClause] = match;
      const length = calculatePicLength(picClause);

      if (length > 0) {
        fields.push({
          id: `field_${fields.length}`,
          name: fieldName.replace(/-/g, '_'),
          startPosition: currentPosition,
          length,
          dataType: picClause.toUpperCase().startsWith('9') ? 'numeric' : 'string',
          trimMode: 'both',
          description: `PIC ${picClause}`,
        });
        currentPosition += length;
      }
    }
  }

  return fields;
}

/**
 * Calculate the byte length from a COBOL PIC clause.
 */
function calculatePicLength(pic: string): number {
  const upper = pic.toUpperCase();
  
  // Match patterns like X(10), 9(7), 9(7)V99
  const repeatMatch = upper.match(/([X9A])\((\d+)\)(V(\d+))?/);
  if (repeatMatch) {
    let length = parseInt(repeatMatch[2], 10);
    if (repeatMatch[4]) {
      length += parseInt(repeatMatch[4], 10);
    }
    return length;
  }

  // Match patterns like XXX, 999, XXXXX
  const simpleMatch = upper.match(/^([X9A]+)$/);
  if (simpleMatch) {
    return simpleMatch[1].length;
  }

  return 0;
}

// ===== Utility Functions =====

/**
 * Split text into lines respecting the configured line ending.
 */
function splitLines(text: string, lineEnding: string, skipEmpty: boolean): string[] {
  let separator: RegExp;
  
  switch (lineEnding) {
    case 'crlf':
      separator = /\r\n/;
      break;
    case 'lf':
      separator = /\n/;
      break;
    case 'cr':
      separator = /\r/;
      break;
    case 'auto':
    default:
      separator = /\r?\n/;
      break;
  }

  const lines = text.split(separator);
  return skipEmpty ? lines.filter(l => l.length > 0) : lines;
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
