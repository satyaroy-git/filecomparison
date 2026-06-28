import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Upload, Download, Wand2 } from 'lucide-react';
import type { FixedWidthField, TrimMode, FieldDataType } from '@/types';

export function FixedWidthConfigPanel() {
  const { fixedWidthConfig, setFixedWidthConfig } = useAppStore();
  const [schemaInput, setSchemaInput] = useState('');
  const [showImport, setShowImport] = useState(false);

  const addField = () => {
    const lastField = fixedWidthConfig.fields[fixedWidthConfig.fields.length - 1];
    const newStart = lastField ? lastField.startPosition + lastField.length : 0;

    const newField: FixedWidthField = {
      id: `field_${Date.now()}`,
      name: `Field_${fixedWidthConfig.fields.length + 1}`,
      startPosition: newStart,
      length: 10,
      dataType: 'string',
      trimMode: 'both',
    };

    setFixedWidthConfig({ fields: [...fixedWidthConfig.fields, newField] });
  };

  const updateField = (index: number, updates: Partial<FixedWidthField>) => {
    const fields = [...fixedWidthConfig.fields];
    fields[index] = { ...fields[index], ...updates };
    setFixedWidthConfig({ fields });
  };

  const removeField = (index: number) => {
    const fields = fixedWidthConfig.fields.filter((_, i) => i !== index);
    setFixedWidthConfig({ fields });
  };

  const handleSchemaImport = () => {
    try {
      const schema = JSON.parse(schemaInput);
      if (schema.fields && Array.isArray(schema.fields)) {
        setFixedWidthConfig({
          fields: schema.fields,
          recordLength: schema.recordLength,
        });
        setShowImport(false);
        setSchemaInput('');
      }
    } catch {
      alert('Invalid JSON schema format');
    }
  };

  const handleSchemaExport = () => {
    const schema = {
      name: 'Exported Schema',
      version: '1.0',
      recordLength: fixedWidthConfig.recordLength || 
        Math.max(...fixedWidthConfig.fields.map(f => f.startPosition + f.length), 0),
      fields: fixedWidthConfig.fields,
      createdAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'field-layout.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={addField}>
          <Plus className="w-3.5 h-3.5" />
          Add Field
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowImport(!showImport)}>
          <Upload className="w-3.5 h-3.5" />
          Import Schema
        </Button>
        {fixedWidthConfig.fields.length > 0 && (
          <Button size="sm" variant="secondary" onClick={handleSchemaExport}>
            <Download className="w-3.5 h-3.5" />
            Export Schema
          </Button>
        )}
      </div>

      {/* Import Area */}
      {showImport && (
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] space-y-3">
          <p className="text-sm font-medium text-[var(--color-foreground)]">Import JSON Schema</p>
          <textarea
            value={schemaInput}
            onChange={(e) => setSchemaInput(e.target.value)}
            placeholder='{"fields": [{"name": "ID", "startPosition": 0, "length": 5, ...}]}'
            className="w-full h-32 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSchemaImport}>Apply</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Field List */}
      {fixedWidthConfig.fields.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--color-border)] rounded-xl">
          <Wand2 className="w-10 h-10 mx-auto text-[var(--color-muted-foreground)] mb-3" />
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No fields defined yet. Add fields manually or import a schema.
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Each field needs a name, start position, and length.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_100px_100px_40px] gap-2 px-2 text-xs font-medium text-[var(--color-muted-foreground)]">
            <span>Name</span>
            <span>Start</span>
            <span>Length</span>
            <span>Type</span>
            <span>Trim</span>
            <span></span>
          </div>

          {fixedWidthConfig.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_80px_80px_100px_100px_40px] gap-2 p-2 rounded-lg bg-white border border-[var(--color-border)]"
            >
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateField(index, { name: e.target.value })}
                className="px-2 py-1 rounded border border-[var(--color-border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <input
                type="number"
                value={field.startPosition}
                onChange={(e) => updateField(index, { startPosition: parseInt(e.target.value) || 0 })}
                min={0}
                className="px-2 py-1 rounded border border-[var(--color-border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <input
                type="number"
                value={field.length}
                onChange={(e) => updateField(index, { length: parseInt(e.target.value) || 1 })}
                min={1}
                className="px-2 py-1 rounded border border-[var(--color-border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <select
                value={field.dataType}
                onChange={(e) => updateField(index, { dataType: e.target.value as FieldDataType })}
                className="px-2 py-1 rounded border border-[var(--color-border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                <option value="string">String</option>
                <option value="numeric">Numeric</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
              </select>
              <select
                value={field.trimMode}
                onChange={(e) => updateField(index, { trimMode: e.target.value as TrimMode })}
                className="px-2 py-1 rounded border border-[var(--color-border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                <option value="none">None</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="both">Both</option>
              </select>
              <button
                onClick={() => removeField(index)}
                className="p-1 rounded hover:bg-red-50 text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Config Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)]">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Encoding</label>
          <select
            value={fixedWidthConfig.encoding}
            onChange={(e) => setFixedWidthConfig({ encoding: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="utf-8">UTF-8</option>
            <option value="ascii">ASCII</option>
            <option value="iso-8859-1">ISO-8859-1 (Latin-1)</option>
            <option value="windows-1252">Windows-1252</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Line Ending</label>
          <select
            value={fixedWidthConfig.lineEnding}
            onChange={(e) => setFixedWidthConfig({ lineEnding: e.target.value as 'auto' | 'crlf' | 'lf' | 'cr' })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="auto">Auto-detect</option>
            <option value="crlf">CRLF (Windows)</option>
            <option value="lf">LF (Unix/Mac)</option>
            <option value="cr">CR (Legacy Mac)</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={fixedWidthConfig.hasHeader}
          onChange={(e) => setFixedWidthConfig({ hasHeader: e.target.checked })}
          className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        />
        <span className="text-sm text-[var(--color-foreground)]">First row is header</span>
      </label>
    </div>
  );
}
