import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, X, AlertTriangle, Ban } from 'lucide-react';
import { cn } from '@/utils/cn';

const WARNING_SIZE = 50 * 1024 * 1024; // 50 MB
const BLOCK_SIZE = 200 * 1024 * 1024;  // 200 MB

interface FileDropZoneProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  accept?: string;
  className?: string;
}

export function FileDropZone({
  label,
  file,
  onFileSelect,
  onFileClear,
  accept = '.csv,.tsv,.txt,.dat,.fixed,.fw',
  className,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [sizeBlocked, setSizeBlocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback((selectedFile: File) => {
    setSizeWarning(null);
    setSizeBlocked(false);

    if (selectedFile.size > BLOCK_SIZE) {
      setSizeBlocked(true);
      setSizeWarning(
        `File is ${formatFileSize(selectedFile.size)} — exceeds the 200 MB limit. Please use a smaller file or split it into chunks.`
      );
      return;
    }

    if (selectedFile.size > WARNING_SIZE) {
      setSizeWarning(
        `File is ${formatFileSize(selectedFile.size)} — large files (>50 MB) may take longer to process and could cause browser slowdowns.`
      );
    }

    onFileSelect(selectedFile);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        validateAndSelect(droppedFile);
      }
    },
    [validateAndSelect]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSelect(selectedFile);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  if (file) {
    const isLarge = file.size > WARNING_SIZE;

    return (
      <div className="space-y-2">
        <div
          className={cn(
            'relative flex items-center gap-3 p-4 rounded-xl border-2',
            isLarge
              ? 'border-amber-400 bg-amber-50'
              : 'border-[var(--color-primary)] bg-blue-50',
            className
          )}
        >
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            isLarge ? 'bg-amber-500' : 'bg-[var(--color-primary)]'
          )}>
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
              {file.name}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {formatFileSize(file.size)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileClear();
              setSizeWarning(null);
              setSizeBlocked(false);
            }}
            className="flex-shrink-0 p-1 rounded-full hover:bg-blue-100 text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] transition-colors"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {sizeWarning && !sizeBlocked && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{sizeWarning}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-[var(--color-primary)] bg-blue-50 scale-[1.02]'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-slate-50',
          className
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
            isDragging ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
          )}
        >
          <Upload className="w-6 h-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--color-foreground)]">{label}</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Drag & drop or click to browse
          </p>
          <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">
            Max 200 MB
          </p>
        </div>
      </div>

      {/* Blocked file error */}
      {sizeBlocked && sizeWarning && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
          <Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{sizeWarning}</p>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
