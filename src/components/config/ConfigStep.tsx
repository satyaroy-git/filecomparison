import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DelimitedConfigPanel } from './DelimitedConfigPanel';
import { FixedWidthConfigPanel } from './FixedWidthConfigPanel';
import { ComparisonConfigPanel } from './ComparisonConfigPanel';
import { ArrowLeft, Play, Loader2, FileSearch } from 'lucide-react';
import { parseDelimitedFile } from '@/core/delimited-parser';
import { parseFixedWidthFile } from '@/core/fixed-width-parser';
import { compareFiles } from '@/core/diff-engine';

export function ConfigStep() {
  const {
    fileFormat,
    fileA,
    fileB,
    delimitedConfig,
    fixedWidthConfig,
    comparisonConfig,
    parsedFileA,
    parsedFileB,
    setParsedFileA,
    setParsedFileB,
    setDiffResult,
    parseProgressA,
    parseProgressB,
    compareProgress,
    setParseProgressA,
    setParseProgressB,
    setCompareProgress,
    setStep,
    isLoading,
    setIsLoading,
    error,
    setError,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'format' | 'comparison'>('format');
  const [isParsing, setIsParsing] = useState(false);

  // Auto-parse files when entering this step if not yet parsed
  useEffect(() => {
    if (!parsedFileA && !parsedFileB && fileA && fileB && !isParsing) {
      handleParseFiles();
    }
  }, []);

  const handleParseFiles = async () => {
    if (!fileA || !fileB) return;
    setIsParsing(true);
    setError(null);

    try {
      let parsedA = parsedFileA;
      if (!parsedA) {
        if (fileFormat === 'delimited') {
          parsedA = await parseDelimitedFile(fileA, delimitedConfig, setParseProgressA);
        } else {
          parsedA = await parseFixedWidthFile(fileA, fixedWidthConfig, setParseProgressA);
        }
        setParsedFileA(parsedA);
      }

      let parsedB = parsedFileB;
      if (!parsedB) {
        if (fileFormat === 'delimited') {
          parsedB = await parseDelimitedFile(fileB, delimitedConfig, setParseProgressB);
        } else {
          parsedB = await parseFixedWidthFile(fileB, fixedWidthConfig, setParseProgressB);
        }
        setParsedFileB(parsedB);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse files');
    } finally {
      setIsParsing(false);
      setParseProgressA(null);
      setParseProgressB(null);
    }
  };

  const handleCompare = async () => {
    if (!fileA || !fileB) return;

    setIsLoading(true);
    setError(null);

    try {
      // Ensure files are parsed
      let parsedA = parsedFileA;
      if (!parsedA) {
        if (fileFormat === 'delimited') {
          parsedA = await parseDelimitedFile(fileA, delimitedConfig, setParseProgressA);
        } else {
          parsedA = await parseFixedWidthFile(fileA, fixedWidthConfig, setParseProgressA);
        }
        setParsedFileA(parsedA);
      }

      let parsedB = parsedFileB;
      if (!parsedB) {
        if (fileFormat === 'delimited') {
          parsedB = await parseDelimitedFile(fileB, delimitedConfig, setParseProgressB);
        } else {
          parsedB = await parseFixedWidthFile(fileB, fixedWidthConfig, setParseProgressB);
        }
        setParsedFileB(parsedB);
      }

      // Run comparison
      const result = await compareFiles(parsedA, parsedB, comparisonConfig, setCompareProgress);
      setDiffResult(result);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setParseProgressA(null);
      setParseProgressB(null);
      setCompareProgress(null);
    }
  };

  const filesParsed = parsedFileA !== null && parsedFileB !== null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('format')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'format'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
          }`}
        >
          Format Settings
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'comparison'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
          }`}
        >
          Column Mapping & Comparison
          {filesParsed && (
            <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-green-500" title="Files parsed" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'format' && (
          <>
            {fileFormat === 'delimited' ? <DelimitedConfigPanel /> : <FixedWidthConfigPanel />}
            {/* Re-parse button if format settings change */}
            {filesParsed && (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                <p className="text-xs text-blue-700">Files already parsed. Change format settings and re-parse if needed.</p>
                <Button size="sm" variant="secondary" onClick={() => { setParsedFileA(null); setParsedFileB(null); handleParseFiles(); }}>
                  <FileSearch className="w-3.5 h-3.5" />
                  Re-Parse
                </Button>
              </div>
            )}
          </>
        )}
        {activeTab === 'comparison' && <ComparisonConfigPanel />}
      </div>

      {/* Progress */}
      {(isParsing || isLoading) && (
        <div className="space-y-3 p-4 rounded-xl bg-[var(--color-muted)]">
          {parseProgressA && (
            <ProgressBar progress={parseProgressA.progress} message={`File A: ${parseProgressA.message}`} />
          )}
          {parseProgressB && (
            <ProgressBar progress={parseProgressB.progress} message={`File B: ${parseProgressB.message}`} />
          )}
          {compareProgress && (
            <ProgressBar progress={compareProgress.progress} message={compareProgress.message} />
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-[var(--color-danger-bg)] border border-red-200">
          <p className="text-sm text-[var(--color-danger)] font-medium">Error</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={() => setStep('upload')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {!filesParsed && (
            <Button
              variant="secondary"
              onClick={handleParseFiles}
              disabled={isParsing || !fileA || !fileB}
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <FileSearch className="w-4 h-4" />
                  Parse Files
                </>
              )}
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleCompare}
            disabled={isLoading || isParsing}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Comparison
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
