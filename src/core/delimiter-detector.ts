import type { DelimiterDetectionResult, DelimiterType } from '@/types';

const COMMON_DELIMITERS: { char: string; type: DelimiterType }[] = [
  { char: ',', type: ',' },
  { char: '\t', type: '\t' },
  { char: '|', type: '|' },
  { char: ';', type: ';' },
];

/**
 * Auto-detect the delimiter used in a text file by analyzing
 * frequency consistency across lines.
 * 
 * Strategy: For each candidate delimiter, count occurrences per line.
 * The best delimiter is the one with the most consistent non-zero count
 * across all sample lines.
 */
export function detectDelimiter(sampleText: string): DelimiterDetectionResult {
  const lines = sampleText.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { delimiter: ',', confidence: 0 };
  }

  // Take up to 20 lines for analysis
  const sampleLines = lines.slice(0, 20);
  
  let bestDelimiter: DelimiterType = ',';
  let bestScore = 0;
  let bestConfidence = 0;

  for (const { char, type } of COMMON_DELIMITERS) {
    const counts = sampleLines.map(line => countDelimiterInLine(line, char));
    const score = calculateConsistencyScore(counts);
    
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = type;
      bestConfidence = score;
    }
  }

  return {
    delimiter: bestDelimiter,
    confidence: Math.min(bestConfidence, 1),
  };
}

/**
 * Count occurrences of a delimiter in a line, respecting quoted fields.
 */
function countDelimiterInLine(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Check if it's an escaped quote
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      count++;
    }
  }
  
  return count;
}

/**
 * Calculate a consistency score for delimiter counts across lines.
 * A good delimiter will have the same count on every line.
 * Returns a score between 0 and 1.
 */
function calculateConsistencyScore(counts: number[]): number {
  if (counts.length === 0) return 0;
  
  // Filter out zero counts (lines without this delimiter)
  const nonZeroCounts = counts.filter(c => c > 0);
  
  if (nonZeroCounts.length === 0) return 0;
  
  // If less than half the lines have this delimiter, it's probably not it
  if (nonZeroCounts.length < counts.length * 0.5) return 0;
  
  // Calculate the mode (most common count)
  const frequency: Record<number, number> = {};
  for (const count of nonZeroCounts) {
    frequency[count] = (frequency[count] || 0) + 1;
  }
  
  const maxFrequency = Math.max(...Object.values(frequency));
  const mode = Number(Object.keys(frequency).find(k => frequency[Number(k)] === maxFrequency));
  
  // Score based on:
  // 1. How many lines have the delimiter (coverage)
  // 2. How consistent the count is (consistency)
  // 3. The count itself (more columns = more likely a structured file)
  const coverage = nonZeroCounts.length / counts.length;
  const consistency = maxFrequency / nonZeroCounts.length;
  const columnBonus = Math.min(mode / 10, 1); // Favor more columns, up to 10
  
  return coverage * 0.3 + consistency * 0.5 + columnBonus * 0.2;
}

/**
 * Detect if the file likely has a header row by comparing
 * the first row's data types with subsequent rows.
 */
export function detectHeader(lines: string[], delimiter: string): boolean {
  if (lines.length < 2) return false;
  
  const firstLine = lines[0].split(delimiter);
  const secondLine = lines[1].split(delimiter);
  
  if (firstLine.length !== secondLine.length) return false;
  
  let headerScore = 0;
  
  for (let i = 0; i < firstLine.length; i++) {
    const firstVal = firstLine[i].trim().replace(/^"|"$/g, '');
    const secondVal = secondLine[i].trim().replace(/^"|"$/g, '');
    
    // If first row is non-numeric but second row is numeric, likely a header
    const firstIsNumeric = /^-?\d*\.?\d+$/.test(firstVal);
    const secondIsNumeric = /^-?\d*\.?\d+$/.test(secondVal);
    
    if (!firstIsNumeric && secondIsNumeric) {
      headerScore += 2;
    }
    
    // If first row contains typical header patterns
    if (/^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(firstVal) && firstVal.length < 50) {
      headerScore += 1;
    }
    
    // If first row value is unique across all sampled rows
    if (firstVal !== secondVal) {
      headerScore += 0.5;
    }
  }
  
  return headerScore >= firstLine.length * 0.5;
}
