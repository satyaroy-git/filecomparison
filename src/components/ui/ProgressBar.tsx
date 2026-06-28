import { cn } from '@/utils/cn';

interface ProgressBarProps {
  progress: number;
  message?: string;
  className?: string;
}

export function ProgressBar({ progress, message, className }: ProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1">
        {message && (
          <span className="text-xs text-[var(--color-muted-foreground)]">{message}</span>
        )}
        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}
