/**
 * Profile History Tracking
 * Detects and records changes to profile fields over time
 */

import { type Employer, type Education } from './types';

// Re-export for backward compatibility
export type { Employer, Education };

export interface HistoryEntry {
  date: string;
  field: 'name' | 'headline' | 'location' | 'employers' | 'education';
  oldValue: unknown;
  newValue: unknown;
}

export interface StoredProfile {
  name: string;
  headline?: string;
  location?: string;
  avatarUrl?: string;
  employers?: Employer[];
  education?: Education[];
  history?: HistoryEntry[];
  firstSeen: string;
  lastSeen: string;
}

export interface ProfileChange {
  field: 'name' | 'headline' | 'location' | 'employers' | 'education';
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Detect changes between stored profile and new profile data
 */
export function detectChanges(
  oldProfile: StoredProfile,
  newProfile: Partial<StoredProfile>
): ProfileChange[] {
  const changes: ProfileChange[] = [];

  // Check name change
  if (newProfile.name !== undefined && newProfile.name !== oldProfile.name) {
    changes.push({
      field: 'name',
      oldValue: oldProfile.name,
      newValue: newProfile.name,
    });
  }

  // Check headline change
  if (newProfile.headline !== undefined && newProfile.headline !== oldProfile.headline) {
    changes.push({
      field: 'headline',
      oldValue: oldProfile.headline,
      newValue: newProfile.headline,
    });
  }

  // Check location change
  if (newProfile.location !== undefined && newProfile.location !== oldProfile.location) {
    changes.push({
      field: 'location',
      oldValue: oldProfile.location,
      newValue: newProfile.location,
    });
  }

  // Check employers change (compare by JSON stringification for arrays)
  if (newProfile.employers !== undefined) {
    const oldEmployers = JSON.stringify(oldProfile.employers || []);
    const newEmployers = JSON.stringify(newProfile.employers || []);
    if (oldEmployers !== newEmployers) {
      changes.push({
        field: 'employers',
        oldValue: oldProfile.employers,
        newValue: newProfile.employers,
      });
    }
  }

  // Check education change
  if (newProfile.education !== undefined) {
    const oldEducation = JSON.stringify(oldProfile.education || []);
    const newEducation = JSON.stringify(newProfile.education || []);
    if (oldEducation !== newEducation) {
      changes.push({
        field: 'education',
        oldValue: oldProfile.education,
        newValue: newProfile.education,
      });
    }
  }

  return changes;
}

/**
 * Record changes to profile history
 */
export function recordHistory(
  profile: StoredProfile,
  changes: ProfileChange[],
  timestamp: string
): StoredProfile {
  if (changes.length === 0) {
    return profile;
  }

  const newEntries: HistoryEntry[] = changes.map((change) => ({
    date: timestamp,
    field: change.field,
    oldValue: change.oldValue,
    newValue: change.newValue,
  }));

  return {
    ...profile,
    history: [...(profile.history || []), ...newEntries],
  };
}
