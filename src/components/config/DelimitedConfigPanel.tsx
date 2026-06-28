import { useAppStore } from '@/stores/app-store';
import type { DelimiterType } from '@/types';

export function DelimitedConfigPanel() {
  const { delimitedConfig, setDelimitedConfig } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Delimiter */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Delimiter</label>
          <select
            value={delimitedConfig.delimiter}
            onChange={(e) => setDelimitedConfig({ delimiter: e.target.value as DelimiterType })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            <option value=",">Comma (,)</option>
            <option value="&#9;">Tab (\t)</option>
            <option value="|">Pipe (|)</option>
            <option value=";">Semicolon (;)</option>
            <option value="custom">Custom...</option>
          </select>
        </div>

        {/* Custom Delimiter */}
        {delimitedConfig.delimiter === 'custom' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-foreground)]">Custom Delimiter</label>
            <input
              type="text"
              value={delimitedConfig.customDelimiter || ''}
              onChange={(e) => setDelimitedConfig({ customDelimiter: e.target.value })}
              placeholder="Enter character..."
              maxLength={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        )}

        {/* Quote Character */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Quote Character</label>
          <select
            value={delimitedConfig.quoteChar}
            onChange={(e) => setDelimitedConfig({ quoteChar: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            <option value='"'>Double quote (")</option>
            <option value="'">Single quote (')</option>
            <option value="">None</option>
          </select>
        </div>

        {/* Encoding */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Encoding</label>
          <select
            value={delimitedConfig.encoding}
            onChange={(e) => setDelimitedConfig({ encoding: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            <option value="utf-8">UTF-8</option>
            <option value="ascii">ASCII</option>
            <option value="iso-8859-1">ISO-8859-1 (Latin-1)</option>
            <option value="windows-1252">Windows-1252</option>
          </select>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={delimitedConfig.hasHeader}
            onChange={(e) => setDelimitedConfig({ hasHeader: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-foreground)]">First row is header</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={delimitedConfig.skipEmptyLines}
            onChange={(e) => setDelimitedConfig({ skipEmptyLines: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-foreground)]">Skip empty lines</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={delimitedConfig.trimFields}
            onChange={(e) => setDelimitedConfig({ trimFields: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-foreground)]">Trim field values</span>
        </label>
      </div>
    </div>
  );
}
