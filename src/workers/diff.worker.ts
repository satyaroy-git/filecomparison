import * as Comlink from 'comlink';
import type {
  ParsedFile,
  ComparisonConfig,
  DiffResult,
  CompareProgress,
} from '@/types';
import { compareFiles } from '@/core/diff-engine';

/**
 * Diff Worker API - runs comparison off the main thread.
 */
const diffWorkerApi = {
  /**
   * Compare two parsed files and produce a diff result.
   */
  async compare(
    fileA: ParsedFile,
    fileB: ParsedFile,
    config: ComparisonConfig,
    onProgress?: (progress: CompareProgress) => void
  ): Promise<DiffResult> {
    return compareFiles(fileA, fileB, config, onProgress);
  },
};

Comlink.expose(diffWorkerApi);

export type DiffWorkerApi = typeof diffWorkerApi;
