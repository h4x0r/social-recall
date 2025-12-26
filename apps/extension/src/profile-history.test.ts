/**
 * Tests for profile history tracking
 * TDD: Write tests first, then implement
 */
import { describe, it, expect } from 'vitest';
import {
  detectChanges,
  recordHistory,
  type StoredProfile,
  type ProfileChange,
  type HistoryEntry,
} from './profile-history';

describe('detectChanges', () => {
  it('returns empty array when no changes detected', () => {
    const oldProfile: StoredProfile = {
      name: 'John Doe',
      headline: 'Software Engineer',
      location: 'San Francisco, CA',
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const newProfile: Partial<StoredProfile> = {
      name: 'John Doe',
      headline: 'Software Engineer',
      location: 'San Francisco, CA',
    };

    const changes = detectChanges(oldProfile, newProfile);
    expect(changes).toEqual([]);
  });

  it('detects name change', () => {
    const oldProfile: StoredProfile = {
      name: 'John Doe',
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const newProfile: Partial<StoredProfile> = {
      name: 'Jonathan Doe',
    };

    const changes = detectChanges(oldProfile, newProfile);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      field: 'name',
      oldValue: 'John Doe',
      newValue: 'Jonathan Doe',
    });
  });

  it('detects headline change', () => {
    const oldProfile: StoredProfile = {
      name: 'John Doe',
      headline: 'Software Engineer',
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const newProfile: Partial<StoredProfile> = {
      name: 'John Doe',
      headline: 'Senior Software Engineer at Google',
    };

    const changes = detectChanges(oldProfile, newProfile);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      field: 'headline',
      oldValue: 'Software Engineer',
      newValue: 'Senior Software Engineer at Google',
    });
  });

  it('detects location change', () => {
    const oldProfile: StoredProfile = {
      name: 'John Doe',
      location: 'San Francisco, CA',
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const newProfile: Partial<StoredProfile> = {
      name: 'John Doe',
      location: 'New York, NY',
    };

    const changes = detectChanges(oldProfile, newProfile);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      field: 'location',
      oldValue: 'San Francisco, CA',
      newValue: 'New York, NY',
    });
  });

  it('detects employer change', () => {
    const oldProfile: StoredProfile = {
      name: 'John Doe',
      employers: [{ company: 'Google', logo: '' }],
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const newProfile: Partial<StoredProfile> = {
      name: 'John Doe',
      employers: [{ company: 'Meta', logo: '' }],
    };

    const changes = detectChanges(oldProfile, newProfile);
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe('employers');
    expect(changes[0].oldValue).toEqual([{ company: 'Google', logo: '' }]);
    expect(changes[0].newValue).toEqual([{ company: 'Meta', logo: '' }]);
  });

  it('detects education change', () => {
    const oldProfile: StoredProfile = {
      name: 'John Doe',
      education: [{ school: 'MIT', degree: 'BS' }],
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const newProfile: Partial<StoredProfile> = {
      name: 'John Doe',
      education: [{ school: 'MIT', degree: 'BS' }, { school: 'Stanford', degree: 'MS' }],
    };

    const changes = detectChanges(oldProfile, newProfile);
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe('education');
  });

  it('detects multiple changes at once', () => {
    const oldProfile: StoredProfile = {
      name: 'John Doe',
      headline: 'Engineer',
      location: 'SF',
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const newProfile: Partial<StoredProfile> = {
      name: 'John Doe',
      headline: 'Senior Engineer',
      location: 'NYC',
    };

    const changes = detectChanges(oldProfile, newProfile);
    expect(changes).toHaveLength(2);
    expect(changes.map(c => c.field)).toContain('headline');
    expect(changes.map(c => c.field)).toContain('location');
  });
});

describe('recordHistory', () => {
  it('adds change to empty history', () => {
    const profile: StoredProfile = {
      name: 'John Doe',
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const change: ProfileChange = {
      field: 'headline',
      oldValue: 'Engineer',
      newValue: 'Senior Engineer',
    };

    const timestamp = '2024-06-01T00:00:00Z';
    const updated = recordHistory(profile, [change], timestamp);

    expect(updated.history).toHaveLength(1);
    expect(updated.history![0]).toEqual({
      date: timestamp,
      field: 'headline',
      oldValue: 'Engineer',
      newValue: 'Senior Engineer',
    });
  });

  it('appends to existing history', () => {
    const existingEntry: HistoryEntry = {
      date: '2024-01-01T00:00:00Z',
      field: 'name',
      oldValue: 'Jon',
      newValue: 'John',
    };

    const profile: StoredProfile = {
      name: 'John Doe',
      history: [existingEntry],
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const change: ProfileChange = {
      field: 'location',
      oldValue: 'SF',
      newValue: 'NYC',
    };

    const timestamp = '2024-06-01T00:00:00Z';
    const updated = recordHistory(profile, [change], timestamp);

    expect(updated.history).toHaveLength(2);
    expect(updated.history![0]).toEqual(existingEntry);
    expect(updated.history![1].field).toBe('location');
  });

  it('records multiple changes with same timestamp', () => {
    const profile: StoredProfile = {
      name: 'John Doe',
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const changes: ProfileChange[] = [
      { field: 'headline', oldValue: 'A', newValue: 'B' },
      { field: 'location', oldValue: 'X', newValue: 'Y' },
    ];

    const timestamp = '2024-06-01T00:00:00Z';
    const updated = recordHistory(profile, changes, timestamp);

    expect(updated.history).toHaveLength(2);
    expect(updated.history!.every(h => h.date === timestamp)).toBe(true);
  });

  it('returns unchanged profile when no changes', () => {
    const profile: StoredProfile = {
      name: 'John Doe',
      firstSeen: '2024-01-01T00:00:00Z',
      lastSeen: '2024-01-01T00:00:00Z',
    };

    const updated = recordHistory(profile, [], '2024-06-01T00:00:00Z');
    expect(updated.history).toBeUndefined();
  });
});
