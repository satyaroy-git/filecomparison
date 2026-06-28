import * as Comlink from 'comlink';
import type { ParserWorkerApi } from './parser.worker';
import type { DiffWorkerApi } from './diff.worker';
import type {
  DelimitedConfig,
  FixedWidthConfig,
  ParsedFile,
  ComparisonConfig,
  DiffResult,
  ParseProgress,
  CompareProgress,
} from '@/types';

/**
 * Worker manager - creates and manages Web Worker instances.
 * Provides a clean API to interact with workers from the main thread.
 */
class WorkerManager {
  private parserWorker: Worker | null = null;
  private parserApi: Comlink.Remote<ParserWorkerApi> | null = null;
  private diffWorker: Worker | null = null;
  private diffApi: Comlink.Remote<DiffWorkerApi> | null = null;

  /**
   * Get or create the parser worker.
   */
  private getParserWorker(): Comlink.Remote<ParserWorkerApi> {
    if (!this.parserApi) {
      this.parserWorker = new Worker(
        new URL('./parser.worker.ts', import.meta.url),
        { type: 'module' }
      );
      this.parserApi = Comlink.wrap<ParserWorkerApi>(this.parserWorker);
    }
    return this.parserApi;
  }

  /**
   * Get or create the diff worker.
   */
  private getDiffWorker(): Comlink.Remote<DiffWorkerApi> {
    if (!this.diffApi) {
      this.diffWorker = new Worker(
        new URL('./diff.worker.ts', import.meta.url),
        { type: 'module' }
      );
      this.diffApi = Comlink.wrap<DiffWorkerApi>(this.diffWorker);
    }
    return this.diffApi;
  }

  /**
   * Parse a delimited file using the worker thread.
   */
  async parseDelimitedFile(
    file: File,
    config: DelimitedConfig,
    onProgress?: (progress: ParseProgress) => void
  ): Promise<ParsedFile> {
    const text = await file.text();
    const parser = this.getParserWorker();

    const progressCallback = onProgress
      ? Comlink.proxy(onProgress)
      : undefined;

    return parser.parseDelimited(
      text,
      file.name,
      file.size,
      file.lastModified,
      config,
      progressCallback
    );
  }

  /**
   * Parse a fixed-width file using the worker thread.
   */
  async parseFixedWidthFile(
    file: File,
    config: FixedWidthConfig,
    onProgress?: (progress: ParseProgress) => void
  ): Promise<ParsedFile> {
    const text = await file.text();
    const parser = this.getParserWorker();

    const progressCallback = onProgress
      ? Comlink.proxy(onProgress)
      : undefined;

    return parser.parseFixedWidth(
      text,
      file.name,
      file.size,
      file.lastModified,
      config,
      progressCallback
    );
  }

  /**
   * Compare two parsed files using the diff worker.
   */
  async compareFiles(
    fileA: ParsedFile,
    fileB: ParsedFile,
    config: ComparisonConfig,
    onProgress?: (progress: CompareProgress) => void
  ): Promise<DiffResult> {
    const diff = this.getDiffWorker();

    const progressCallback = onProgress
      ? Comlink.proxy(onProgress)
      : undefined;

    return diff.compare(fileA, fileB, config, progressCallback);
  }

  /**
   * Terminate all workers and clean up resources.
   */
  terminate(): void {
    if (this.parserWorker) {
      this.parserWorker.terminate();
      this.parserWorker = null;
      this.parserApi = null;
    }
    if (this.diffWorker) {
      this.diffWorker.terminate();
      this.diffWorker = null;
      this.diffApi = null;
    }
  }
}

// Singleton instance
export const workerManager = new WorkerManager();
