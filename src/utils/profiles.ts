import type { ComparisonProfile, FileFormat, DelimitedConfig, FixedWidthConfig, ComparisonConfig } from '@/types';

const STORAGE_KEY = 'filediff_profiles';

/**
 * Get all saved profiles from localStorage.
 */
export function getProfiles(): ComparisonProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ComparisonProfile[];
  } catch {
    return [];
  }
}

/**
 * Save a new profile.
 */
export function saveProfile(profile: ComparisonProfile): void {
  const profiles = getProfiles();
  const existingIdx = profiles.findIndex(p => p.id === profile.id);
  if (existingIdx >= 0) {
    profiles[existingIdx] = profile;
  } else {
    profiles.push(profile);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

/**
 * Delete a profile by ID.
 */
export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

/**
 * Export all profiles as JSON string.
 */
export function exportProfiles(): string {
  return JSON.stringify(getProfiles(), null, 2);
}

/**
 * Import profiles from JSON string, merging with existing.
 */
export function importProfiles(json: string): number {
  const imported = JSON.parse(json) as ComparisonProfile[];
  if (!Array.isArray(imported)) throw new Error('Invalid profiles format');

  const existing = getProfiles();
  const existingIds = new Set(existing.map(p => p.id));

  let added = 0;
  for (const profile of imported) {
    if (!existingIds.has(profile.id)) {
      existing.push(profile);
      added++;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return added;
}

/**
 * Create a new profile from current settings.
 */
export function createProfile(
  name: string,
  description: string,
  fileFormat: FileFormat,
  fileConfig: DelimitedConfig | FixedWidthConfig,
  comparisonConfig: ComparisonConfig
): ComparisonProfile {
  return {
    id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name,
    description,
    fileFormat,
    fileConfig,
    comparisonConfig,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
