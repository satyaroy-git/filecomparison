import { create } from 'zustand';
import type {
  FileFormat,
  DelimitedConfig,
  FixedWidthConfig,
  ComparisonConfig,
  ParsedFile,
  DiffResult,
  ParseProgress,
  CompareProgress,
  UIState,
  DiffFilter,
  ViewMode,
  DEFAULT_DELIMITED_CONFIG,
  DEFAULT_FIXED_WIDTH_CONFIG,
  DEFAULT_COMPARISON_CONFIG,
  DEFAULT_UI_STATE,
} from '@/types';

export type AppStep = 'upload' | 'configure' | 'compare' | 'results';

export interface AppState {
  // Current step in the workflow
  step: AppStep;
  setStep: (step: AppStep) => void;

  // File format selection
  fileFormat: FileFormat;
  setFileFormat: (format: FileFormat) => void;

  // Raw files
  fileA: File | null;
  fileB: File | null;
  setFileA: (file: File | null) => void;
  setFileB: (file: File | null) => void;

  // File configs
  delimitedConfig: DelimitedConfig;
  setDelimitedConfig: (config: Partial<DelimitedConfig>) => void;
  fixedWidthConfig: FixedWidthConfig;
  setFixedWidthConfig: (config: Partial<FixedWidthConfig>) => void;

  // Comparison config
  comparisonConfig: ComparisonConfig;
  setComparisonConfig: (config: Partial<ComparisonConfig>) => void;

  // Parsed files
  parsedFileA: ParsedFile | null;
  parsedFileB: ParsedFile | null;
  setParsedFileA: (file: ParsedFile | null) => void;
  setParsedFileB: (file: ParsedFile | null) => void;

  // Diff results
  diffResult: DiffResult | null;
  setDiffResult: (result: DiffResult | null) => void;

  // Progress tracking
  parseProgressA: ParseProgress | null;
  parseProgressB: ParseProgress | null;
  compareProgress: CompareProgress | null;
  setParseProgressA: (progress: ParseProgress | null) => void;
  setParseProgressB: (progress: ParseProgress | null) => void;
  setCompareProgress: (progress: CompareProgress | null) => void;

  // UI state
  uiState: UIState;
  setViewMode: (mode: ViewMode) => void;
  setDiffFilter: (filter: DiffFilter) => void;
  toggleSyncScroll: () => void;
  toggleShowUnchanged: () => void;
  toggleCharDiffs: () => void;

  // Loading & error states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

const initialDelimitedConfig: DelimitedConfig = {
  delimiter: ',',
  hasHeader: true,
  quoteChar: '"',
  escapeChar: '"',
  skipEmptyLines: true,
  trimFields: false,
  encoding: 'utf-8',
};

const initialFixedWidthConfig: FixedWidthConfig = {
  fields: [],
  hasHeader: false,
  encoding: 'utf-8',
  skipEmptyLines: true,
  lineEnding: 'auto',
};

const initialComparisonConfig: ComparisonConfig = {
  matchStrategy: 'position',
  keyColumns: [],
  joinType: 'full-outer',
  caseSensitive: true,
  trimBeforeCompare: false,
  ignoreColumns: [],
  numericTolerance: 0,
  dateFormats: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'],
  fuzzyThreshold: 0.8,
  ignoreWhitespace: false,
  treatEmptyAsNull: false,
};

const initialUIState: UIState = {
  viewMode: 'side-by-side',
  diffFilter: 'all',
  showLineNumbers: true,
  syncScroll: true,
  highlightCharDiffs: true,
  showUnchangedRows: true,
  currentPage: 0,
  pageSize: 1000,
};

export const useAppStore = create<AppState>((set) => ({
  // Step
  step: 'upload',
  setStep: (step) => set({ step }),

  // File format
  fileFormat: 'delimited',
  setFileFormat: (format) => set({ fileFormat: format }),

  // Files
  fileA: null,
  fileB: null,
  setFileA: (file) => set({ fileA: file, parsedFileA: null, diffResult: null }),
  setFileB: (file) => set({ fileB: file, parsedFileB: null, diffResult: null }),

  // Configs
  delimitedConfig: initialDelimitedConfig,
  setDelimitedConfig: (config) =>
    set((state) => ({ delimitedConfig: { ...state.delimitedConfig, ...config } })),
  fixedWidthConfig: initialFixedWidthConfig,
  setFixedWidthConfig: (config) =>
    set((state) => ({ fixedWidthConfig: { ...state.fixedWidthConfig, ...config } })),
  comparisonConfig: initialComparisonConfig,
  setComparisonConfig: (config) =>
    set((state) => ({ comparisonConfig: { ...state.comparisonConfig, ...config } })),

  // Parsed files
  parsedFileA: null,
  parsedFileB: null,
  setParsedFileA: (file) => set({ parsedFileA: file }),
  setParsedFileB: (file) => set({ parsedFileB: file }),

  // Diff results
  diffResult: null,
  setDiffResult: (result) => set({ diffResult: result }),

  // Progress
  parseProgressA: null,
  parseProgressB: null,
  compareProgress: null,
  setParseProgressA: (progress) => set({ parseProgressA: progress }),
  setParseProgressB: (progress) => set({ parseProgressB: progress }),
  setCompareProgress: (progress) => set({ compareProgress: progress }),

  // UI state
  uiState: initialUIState,
  setViewMode: (mode) =>
    set((state) => ({ uiState: { ...state.uiState, viewMode: mode } })),
  setDiffFilter: (filter) =>
    set((state) => ({ uiState: { ...state.uiState, diffFilter: filter } })),
  toggleSyncScroll: () =>
    set((state) => ({ uiState: { ...state.uiState, syncScroll: !state.uiState.syncScroll } })),
  toggleShowUnchanged: () =>
    set((state) => ({ uiState: { ...state.uiState, showUnchangedRows: !state.uiState.showUnchangedRows } })),
  toggleCharDiffs: () =>
    set((state) => ({ uiState: { ...state.uiState, highlightCharDiffs: !state.uiState.highlightCharDiffs } })),

  // Loading & errors
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  error: null,
  setError: (error) => set({ error }),

  // Reset
  reset: () =>
    set({
      step: 'upload',
      fileA: null,
      fileB: null,
      parsedFileA: null,
      parsedFileB: null,
      diffResult: null,
      parseProgressA: null,
      parseProgressB: null,
      compareProgress: null,
      isLoading: false,
      error: null,
      delimitedConfig: initialDelimitedConfig,
      fixedWidthConfig: initialFixedWidthConfig,
      comparisonConfig: initialComparisonConfig,
      uiState: initialUIState,
    }),
}));
