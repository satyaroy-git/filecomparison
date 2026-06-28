// ===== File Types =====

export type FileFormat = 'delimited' | 'fixed-width';

export type DelimiterType = ',' | '\t' | '|' | ';' | 'custom';

export interface FileInfo {
  name: string;
  size: number;
  lastModified: number;
  encoding: string;
  lineCount: number;
  format: FileFormat;
}

// ===== Delimited File Configuration =====

export interface DelimitedConfig {
  delimiter: DelimiterType;
  customDelimiter?: string;
  hasHeader: boolean;
  quoteChar: string;
  escapeChar: string;
  commentChar?: string;
  skipEmptyLines: boolean;
  trimFields: boolean;
  encoding: string;
}

export const DEFAULT_DELIMITED_CONFIG: DelimitedConfig = {
  delimiter: ',',
  hasHeader: true,
  quoteChar: '"',
  escapeChar: '"',
  skipEmptyLines: true,
  trimFields: false,
  encoding: 'utf-8',
};

// ===== Fixed-Width File Configuration =====

export interface FixedWidthField {
  id: string;
  name: string;
  startPosition: number; // 0-indexed
  length: number;
  dataType: FieldDataType;
  trimMode: TrimMode;
  description?: string;
}

export type FieldDataType = 'string' | 'numeric' | 'date' | 'boolean' | 'packed-decimal';

export type TrimMode = 'none' | 'left' | 'right' | 'both';

export interface FixedWidthConfig {
  fields: FixedWidthField[];
  hasHeader: boolean;
  recordLength?: number; // Expected record length (auto-detected if not set)
  encoding: string;
  skipEmptyLines: boolean;
  lineEnding: 'auto' | 'crlf' | 'lf' | 'cr';
}

export const DEFAULT_FIXED_WIDTH_CONFIG: FixedWidthConfig = {
  fields: [],
  hasHeader: false,
  encoding: 'utf-8',
  skipEmptyLines: true,
  lineEnding: 'auto',
};

// ===== Fixed-Width Schema (Import/Export) =====

export interface FixedWidthSchema {
  name: string;
  description?: string;
  recordLength: number;
  fields: FixedWidthField[];
  version: string;
  createdAt: string;
}

// ===== Parsed Data =====

export interface ParsedFile {
  fileInfo: FileInfo;
  headers: string[];
  rows: string[][];
  totalRows: number;
  parseErrors: ParseError[];
  config: DelimitedConfig | FixedWidthConfig;
}

export interface ParseError {
  row: number;
  message: string;
  type: 'warning' | 'error';
}

// ===== Comparison Configuration =====

export type MatchStrategy = 'key' | 'position' | 'fuzzy';

export type JoinType = 'full-outer' | 'inner' | 'left';

// ===== Column Mapping =====

export interface ColumnMapping {
  columnIndexA: number;
  columnIndexB: number;
  headerA: string;
  headerB: string;
}

export interface ComparisonConfig {
  matchStrategy: MatchStrategy;
  keyColumns: number[]; // Column indices in File A used as keys
  keyColumnsB: number[]; // Corresponding key column indices in File B (when headers differ)
  joinType: JoinType;
  caseSensitive: boolean;
  trimBeforeCompare: boolean;
  ignoreColumns: number[];
  numericTolerance: number; // e.g., 0.001 means 1.000 == 1.001
  dateFormats: string[]; // Formats to try for date normalization
  fuzzyThreshold: number; // 0.0 - 1.0, minimum similarity score
  ignoreWhitespace: boolean;
  treatEmptyAsNull: boolean;
  columnMappings: ColumnMapping[]; // User-defined column mappings between files
}

export const DEFAULT_COMPARISON_CONFIG: ComparisonConfig = {
  matchStrategy: 'position',
  keyColumns: [],
  keyColumnsB: [],
  joinType: 'full-outer',
  caseSensitive: true,
  trimBeforeCompare: false,
  ignoreColumns: [],
  numericTolerance: 0,
  dateFormats: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'],
  fuzzyThreshold: 0.8,
  ignoreWhitespace: false,
  treatEmptyAsNull: false,
  columnMappings: [],
};

// ===== Diff Results =====

export type RowStatus = 'added' | 'removed' | 'modified' | 'unchanged' | 'moved';

export type CellStatus = 'same' | 'changed' | 'added' | 'removed';

export interface CharDiff {
  value: string;
  type: 'same' | 'added' | 'removed';
}

export interface DiffCell {
  columnIndex: number;
  status: CellStatus;
  valueA: string | null;
  valueB: string | null;
  charDiffs?: CharDiff[];
}

export interface DiffRow {
  id: string;
  status: RowStatus;
  lineNumberA: number | null;
  lineNumberB: number | null;
  keyValue?: string;
  cells: DiffCell[];
  similarityScore?: number; // For fuzzy matches
}

export interface ColumnStat {
  columnIndex: number;
  columnName: string;
  totalCells: number;
  changedCells: number;
  addedCells: number;
  removedCells: number;
  changePercentage: number;
  dataTypeA?: FieldDataType;
  dataTypeB?: FieldDataType;
}

export interface DiffSummary {
  totalRowsA: number;
  totalRowsB: number;
  addedRows: number;
  removedRows: number;
  modifiedRows: number;
  unchangedRows: number;
  movedRows: number;
  totalColumns: number;
  comparisonTimeMs: number;
}

export interface DiffResult {
  summary: DiffSummary;
  rows: DiffRow[];
  columnStats: ColumnStat[];
  headersA: string[];
  headersB: string[];
  columnMappings: ColumnMapping[]; // The mappings used during comparison
}

// ===== Results Tab =====

export type ResultsTab = 'summary' | 'differences' | 'only-original' | 'only-modified' | 'matched';

// ===== Comparison Profile =====

export interface ComparisonProfile {
  id: string;
  name: string;
  description?: string;
  fileFormat: FileFormat;
  fileConfig: DelimitedConfig | FixedWidthConfig;
  comparisonConfig: ComparisonConfig;
  createdAt: string;
  updatedAt: string;
}

// ===== UI State =====

export type ViewMode = 'side-by-side' | 'inline' | 'table' | 'summary';

export type DiffFilter = 'all' | 'added' | 'removed' | 'modified' | 'unchanged';

export interface UIState {
  viewMode: ViewMode;
  diffFilter: DiffFilter;
  showLineNumbers: boolean;
  syncScroll: boolean;
  highlightCharDiffs: boolean;
  showUnchangedRows: boolean;
  currentPage: number;
  pageSize: number;
}

export const DEFAULT_UI_STATE: UIState = {
  viewMode: 'side-by-side',
  diffFilter: 'all',
  showLineNumbers: true,
  syncScroll: true,
  highlightCharDiffs: true,
  showUnchangedRows: true,
  currentPage: 0,
  pageSize: 1000,
};

// ===== Worker Messages =====

export interface ParseRequest {
  file: File;
  format: FileFormat;
  config: DelimitedConfig | FixedWidthConfig;
}

export interface ParseProgress {
  phase: 'reading' | 'parsing' | 'complete' | 'error';
  progress: number; // 0-100
  rowsParsed?: number;
  message?: string;
}

export interface CompareRequest {
  fileA: ParsedFile;
  fileB: ParsedFile;
  config: ComparisonConfig;
}

export interface CompareProgress {
  phase: 'matching' | 'diffing' | 'stats' | 'complete' | 'error';
  progress: number;
  message?: string;
}

// ===== Delimiter Detection =====

export interface DelimiterDetectionResult {
  delimiter: DelimiterType;
  confidence: number;
  customDelimiter?: string;
}

// ===== Column Boundary Detection (Fixed-Width) =====

export interface ColumnBoundary {
  startPosition: number;
  endPosition: number;
  confidence: number;
  suggestedName?: string;
  suggestedType?: FieldDataType;
}

export interface ColumnDetectionResult {
  boundaries: ColumnBoundary[];
  recordLength: number;
  confidence: number;
}
