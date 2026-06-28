import { useAppStore } from '@/stores/app-store';
import { GitCompareArrows, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AppStep } from '@/stores/app-store';

const steps: { id: AppStep; label: string; number: number }[] = [
  { id: 'upload', label: 'Upload', number: 1 },
  { id: 'configure', label: 'Configure', number: 2 },
  { id: 'results', label: 'Results', number: 3 },
];

export function Header() {
  const { step, reset } = useAppStore();

  const currentStepIndex = steps.findIndex(s => s.id === step || (step === 'compare' && s.id === 'configure'));

  return (
    <header className="bg-white border-b border-[var(--color-border)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <GitCompareArrows className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--color-foreground)] leading-none">
                FileDiff Pro
              </h1>
              <p className="text-[10px] text-[var(--color-muted-foreground)] leading-none mt-0.5">
                Delimited & Fixed-Width Comparison
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <nav className="hidden sm:flex items-center gap-1">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                      index <= currentStepIndex
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                    )}
                  >
                    {s.number}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      index <= currentStepIndex
                        ? 'text-[var(--color-foreground)]'
                        : 'text-[var(--color-muted-foreground)]'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-8 h-0.5 mx-2 rounded-full',
                      index < currentStepIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                    )}
                  />
                )}
              </div>
            ))}
          </nav>

          {/* Reset */}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}
