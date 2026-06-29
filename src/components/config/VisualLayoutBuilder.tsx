import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/Button';
import { Scissors, RotateCcw, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { FixedWidthField } from '@/types';

const FIELD_COLORS = [
  'bg-blue-100 border-blue-300',
  'bg-green-100 border-green-300',
  'bg-purple-100 border-purple-300',
  'bg-orange-100 border-orange-300',
  'bg-pink-100 border-pink-300',
  'bg-cyan-100 border-cyan-300',
  'bg-yellow-100 border-yellow-300',
  'bg-rose-100 border-rose-300',
  'bg-teal-100 border-teal-300',
  'bg-indigo-100 border-indigo-300',
];

export function VisualLayoutBuilder() {
  const { fileA, fixedWidthConfig, setFixedWidthConfig } = useAppStore();
  const [sampleLines, setSampleLines] = useState<string[]>([]);
  const [boundaries, setBoundaries] = useState<number[]>([]);
  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const charWidth = 8.4; // monospace char width in px

  // Load sample lines from file
  useEffect(() => {
    if (!fileA) {
      setSampleLines([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.length > 0);
      setSampleLines(lines.slice(0, 8));
    };
    reader.readAsText(fileA);
  }, [fileA]);

  // Init boundaries from existing fields
  useEffect(() => {
    if (fixedWidthConfig.fields.length > 0) {
      const bounds: number[] = [];
      for (const f of fixedWidthConfig.fields) {
        if (f.startPosition > 0 && !bounds.includes(f.startPosition)) {
          bounds.push(f.startPosition);
        }
        const end = f.startPosition + f.length;
        if (!bounds.includes(end)) {
          bounds.push(end);
        }
      }
      setBoundaries(bounds.sort((a, b) => a - b));
    }
  }, []);

  const maxLineLength = sampleLines.reduce((max, l) => Math.max(max, l.length), 0);

  const handleClick = useCallback((pos: number) => {
    setBoundaries(prev => {
      if (prev.includes(pos)) {
        // Remove boundary
        return prev.filter(b => b !== pos);
      }
      // Add boundary
      return [...prev, pos].sort((a, b) => a - b);
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const pos = Math.round(x / charWidth);
    setHoverPos(Math.max(0, Math.min(pos, maxLineLength)));
  }, [maxLineLength]);

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null);
  }, []);

  const applyBoundaries = () => {
    // Convert boundaries to fields
    const allBounds = [0, ...boundaries.filter(b => b > 0 && b <= maxLineLength)];
    // Add end if not present
    if (allBounds[allBounds.length - 1] < maxLineLength) {
      allBounds.push(maxLineLength);
    }

    const fields: FixedWidthField[] = [];
    for (let i = 0; i < allBounds.length - 1; i++) {
      const start = allBounds[i];
      const length = allBounds[i + 1] - start;
      if (length <= 0) continue;
      fields.push({
        id: `field_${i}`,
        name: `Field_${i + 1}`,
        startPosition: start,
        length,
        dataType: 'string',
        trimMode: 'both',
      });
    }

    setFixedWidthConfig({ fields, recordLength: maxLineLength });
  };

  const clearBoundaries = () => {
    setBoundaries([]);
  };

  if (sampleLines.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-[var(--color-border)] rounded-xl">
        <Eye className="w-8 h-8 mx-auto text-[var(--color-muted-foreground)] mb-2" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Upload a fixed-width file (File A) to use the visual layout builder.
        </p>
      </div>
    );
  }

  // Get color for a position based on which field it belongs to
  const getFieldIndex = (pos: number): number => {
    const allBounds = [0, ...boundaries];
    for (let i = allBounds.length - 1; i >= 0; i--) {
      if (pos >= allBounds[i]) return i;
    }
    return 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-foreground)] flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Visual Layout Builder
          </h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            Click between characters to mark column boundaries. Click again to remove.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={clearBoundaries}>
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </Button>
          <Button size="sm" onClick={applyBoundaries} disabled={boundaries.length === 0}>
            Apply ({boundaries.length} boundaries)
          </Button>
        </div>
      </div>

      {/* Ruler */}
      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
        <div
          ref={containerRef}
          className="overflow-x-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Position ruler */}
          <div className="relative bg-slate-100 border-b border-[var(--color-border)] h-[20px]" style={{ width: maxLineLength * charWidth + 20 }}>
            {Array.from({ length: Math.ceil(maxLineLength / 5) }, (_, i) => i * 5).map(pos => (
              <span
                key={pos}
                className="absolute top-0 text-[9px] text-[var(--color-muted-foreground)] font-mono"
                style={{ left: pos * charWidth }}
              >
                {pos}
              </span>
            ))}
          </div>

          {/* Tick marks */}
          <div className="relative bg-slate-50 border-b border-[var(--color-border)] h-[10px]" style={{ width: maxLineLength * charWidth + 20 }}>
            {Array.from({ length: maxLineLength }, (_, i) => i).map(pos => (
              <div
                key={pos}
                className={cn(
                  'absolute top-0 w-px',
                  pos % 10 === 0 ? 'h-[10px] bg-slate-400' : pos % 5 === 0 ? 'h-[7px] bg-slate-300' : 'h-[4px] bg-slate-200'
                )}
                style={{ left: pos * charWidth + charWidth / 2 }}
              />
            ))}
            {/* Boundary markers */}
            {boundaries.map(pos => (
              <div
                key={`b-${pos}`}
                className="absolute top-0 w-0.5 h-[10px] bg-red-500 z-10"
                style={{ left: pos * charWidth }}
              />
            ))}
            {/* Hover indicator */}
            {hoverPos !== null && (
              <div
                className="absolute top-0 w-0.5 h-[10px] bg-blue-400 opacity-60 z-5"
                style={{ left: hoverPos * charWidth }}
              />
            )}
          </div>

          {/* Sample data lines */}
          {sampleLines.map((line, lineIdx) => (
            <div
              key={lineIdx}
              className="relative border-b border-[var(--color-border)] last:border-0"
              style={{ width: maxLineLength * charWidth + 20, height: 22 }}
              onClick={(e) => {
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left + containerRef.current.scrollLeft;
                const pos = Math.round(x / charWidth);
                if (pos > 0 && pos < maxLineLength) {
                  handleClick(pos);
                }
              }}
            >
              {/* Colored field backgrounds */}
              {(() => {
                const allBounds = [0, ...boundaries, maxLineLength];
                const sorted = [...new Set(allBounds)].sort((a, b) => a - b);
                return sorted.slice(0, -1).map((start, i) => {
                  const end = sorted[i + 1];
                  const colorIdx = i % FIELD_COLORS.length;
                  return (
                    <div
                      key={`bg-${i}`}
                      className={cn('absolute top-0 h-full border-r', FIELD_COLORS[colorIdx])}
                      style={{ left: start * charWidth, width: (end - start) * charWidth }}
                    />
                  );
                });
              })()}
              {/* Character text */}
              <span
                className="absolute top-[2px] left-0 font-mono text-[12px] leading-[18px] text-[var(--color-foreground)] pointer-events-none whitespace-pre"
                style={{ letterSpacing: `${charWidth - 7.2}px` }}
              >
                {line}
              </span>
              {/* Boundary lines */}
              {boundaries.map(pos => (
                <div
                  key={`line-${pos}`}
                  className="absolute top-0 w-0.5 h-full bg-red-500 z-10 pointer-events-none"
                  style={{ left: pos * charWidth }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Position info */}
      <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
        <span>
          {hoverPos !== null ? `Position: ${hoverPos}` : 'Hover over data to see position'}
        </span>
        <span>Record length: {maxLineLength} chars &middot; {boundaries.length} boundaries &middot; {boundaries.length + 1} fields</span>
      </div>
    </div>
  );
}
