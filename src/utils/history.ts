const HISTORY_KEY = 'filediff_history';
const MAX_HISTORY = 20;

export interface ComparisonHistoryEntry {
  id: string;
  timestamp: string;
  fileAName: string;
  fileBName: string;
  fileFormat: string;
  totalRowsA: number;
  totalRowsB: number;
  modifiedRows: number;
  addedRows: number;
  removedRows: number;
  matchedRows: number;
  profileName?: string;
}

/**
 * Get comparison history from localStorage.
 */
export function getHistory(): ComparisonHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ComparisonHistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Add a new entry to comparison history.
 */
export function addHistoryEntry(entry: Omit<ComparisonHistoryEntry, 'id' | 'timestamp'>): void {
  const history = getHistory();
  const newEntry: ComparisonHistoryEntry = {
    ...entry,
    id: `hist_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  history.unshift(newEntry);
  // Keep only the most recent entries
  const trimmed = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

/**
 * Clear all history.
 */
export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
