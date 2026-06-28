import { FileDropZone } from './FileDropZone';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/stores/app-store';
import { ArrowRight, FileText, Columns } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { FileFormat } from '@/types';

export function UploadStep() {
  const {
    fileFormat,
    setFileFormat,
    fileA,
    fileB,
    setFileA,
    setFileB,
    setStep,
  } = useAppStore();

  const canProceed = fileA !== null && fileB !== null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Format Selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          File Format
        </h2>
        <div className="flex gap-3">
          <FormatCard
            format="delimited"
            currentFormat={fileFormat}
            onSelect={setFileFormat}
            icon={<FileText className="w-5 h-5" />}
            title="Delimited"
            description="CSV, TSV, pipe-separated, or custom delimiter"
          />
          <FormatCard
            format="fixed-width"
            currentFormat={fileFormat}
            onSelect={setFileFormat}
            icon={<Columns className="w-5 h-5" />}
            title="Fixed Width"
            description="Positional columns with defined field lengths"
          />
        </div>
      </div>

      {/* File Upload Area */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          Select Files to Compare
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Original File (A)
            </label>
            <FileDropZone
              label="Drop original file here"
              file={fileA}
              onFileSelect={(f) => setFileA(f)}
              onFileClear={() => setFileA(null)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Modified File (B)
            </label>
            <FileDropZone
              label="Drop modified file here"
              file={fileB}
              onFileSelect={(f) => setFileB(f)}
              onFileClear={() => setFileB(null)}
            />
          </div>
        </div>
      </div>

      {/* Proceed Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!canProceed}
          onClick={() => setStep('configure')}
        >
          Configure & Compare
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface FormatCardProps {
  format: FileFormat;
  currentFormat: FileFormat;
  onSelect: (format: FileFormat) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FormatCard({ format, currentFormat, onSelect, icon, title, description }: FormatCardProps) {
  const isSelected = format === currentFormat;

  return (
    <button
      onClick={() => onSelect(format)}
      className={cn(
        'flex-1 flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200',
        isSelected
          ? 'border-[var(--color-primary)] bg-blue-50 shadow-sm'
          : 'border-[var(--color-border)] hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          isSelected
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
        )}
      >
        {icon}
      </div>
      <div>
        <p className={cn('font-medium', isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-foreground)]')}>
          {title}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{description}</p>
      </div>
    </button>
  );
}
