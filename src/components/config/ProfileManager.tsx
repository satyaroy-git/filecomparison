import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/Button';
import { getProfiles, saveProfile, deleteProfile, createProfile, exportProfiles, importProfiles } from '@/utils/profiles';
import { Save, FolderOpen, Trash2, Download, Upload } from 'lucide-react';
import type { ComparisonProfile, DelimitedConfig, FixedWidthConfig } from '@/types';

export function ProfileManager() {
  const {
    fileFormat,
    delimitedConfig,
    fixedWidthConfig,
    comparisonConfig,
    setFileFormat,
    setDelimitedConfig,
    setFixedWidthConfig,
    setComparisonConfig,
  } = useAppStore();

  const [profiles, setProfiles] = useState<ComparisonProfile[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileDesc, setProfileDesc] = useState('');

  useEffect(() => {
    setProfiles(getProfiles());
  }, []);

  const handleSave = () => {
    if (!profileName.trim()) return;

    const fileConfig = fileFormat === 'delimited' ? delimitedConfig : fixedWidthConfig;
    const profile = createProfile(profileName.trim(), profileDesc.trim(), fileFormat, fileConfig, comparisonConfig);
    saveProfile(profile);
    setProfiles(getProfiles());
    setShowSave(false);
    setProfileName('');
    setProfileDesc('');
  };

  const handleLoad = (profile: ComparisonProfile) => {
    setFileFormat(profile.fileFormat);
    if (profile.fileFormat === 'delimited') {
      setDelimitedConfig(profile.fileConfig as DelimitedConfig);
    } else {
      setFixedWidthConfig(profile.fileConfig as FixedWidthConfig);
    }
    setComparisonConfig(profile.comparisonConfig);
  };

  const handleDelete = (id: string) => {
    deleteProfile(id);
    setProfiles(getProfiles());
  };

  const handleExport = () => {
    const json = exportProfiles();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comparison-profiles.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const added = importProfiles(text);
        setProfiles(getProfiles());
        alert(`Imported ${added} new profile(s).`);
      } catch {
        alert('Failed to import profiles. Invalid format.');
      }
    };
    input.click();
  };

  return (
    <div className="space-y-3 p-4 border border-[var(--color-border)] rounded-xl bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Comparison Profiles</h3>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={handleImport} title="Import profiles">
            <Upload className="w-3.5 h-3.5" />
          </Button>
          {profiles.length > 0 && (
            <Button size="sm" variant="ghost" onClick={handleExport} title="Export profiles">
              <Download className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button size="sm" onClick={() => setShowSave(!showSave)}>
            <Save className="w-3.5 h-3.5" />
            Save Current
          </Button>
        </div>
      </div>

      {/* Save Form */}
      {showSave && (
        <div className="space-y-2 p-3 bg-[var(--color-muted)] rounded-lg">
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Profile name (e.g., Daily Bank Extract)"
            className="w-full px-3 py-1.5 rounded border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          <input
            type="text"
            value={profileDesc}
            onChange={(e) => setProfileDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-1.5 rounded border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!profileName.trim()}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSave(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Profile List */}
      {profiles.length === 0 ? (
        <p className="text-xs text-[var(--color-muted-foreground)] text-center py-3">
          No saved profiles yet. Save your current settings for reuse.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] hover:bg-slate-50 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{profile.name}</p>
                <p className="text-[10px] text-[var(--color-muted-foreground)]">
                  {profile.fileFormat} &middot; {new Date(profile.createdAt).toLocaleDateString()}
                  {profile.description && ` &middot; ${profile.description}`}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleLoad(profile)}
                  className="p-1.5 rounded text-[var(--color-primary)] hover:bg-blue-50"
                  title="Load profile"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(profile.id)}
                  className="p-1.5 rounded text-[var(--color-danger)] hover:bg-red-50"
                  title="Delete profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
