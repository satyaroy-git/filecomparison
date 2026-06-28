import type { DiffSummary, ColumnStat } from '@/types';
import { Plus, Minus, Pencil, Equal, Clock } from 'lucide-react';

interface SummaryPanelProps {
  summary: DiffSummary;
  columnStats: ColumnStat[];
}

export function SummaryPanel({ summary, columnStats }: SummaryPanelProps) {
  const totalChanges = summary.addedRows + summary.removedRows + summary.modifiedRows;
  const totalRows = Math.max(summary.totalRowsA, summary.totalRowsB);
  const changeRate = totalRows > 0 ? (totalChanges / totalRows) * 100 : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        icon={<Pencil className="w-4 h-4" />}
        label="Modified"
        value={summary.modifiedRows}
        color="amber"
      />
      <StatCard
        icon={<Plus className="w-4 h-4" />}
        label="Added"
        value={summary.addedRows}
        color="green"
      />
      <StatCard
        icon={<Minus className="w-4 h-4" />}
        label="Removed"
        value={summary.removedRows}
        color="red"
      />
      <StatCard
        icon={<Equal className="w-4 h-4" />}
        label="Unchanged"
        value={summary.unchangedRows}
        color="slate"
      />
      <StatCard
        icon={<Clock className="w-4 h-4" />}
        label="Time"
        value={`${summary.comparisonTimeMs.toFixed(0)}ms`}
        color="blue"
      />
      <StatCard
        icon={<Pencil className="w-4 h-4" />}
        label="Change Rate"
        value={`${changeRate.toFixed(1)}%`}
        color="purple"
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'purple';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-lg font-bold leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-xs opacity-80 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
