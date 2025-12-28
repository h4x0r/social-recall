/**
 * Tests for Chrome storage wrapper functions
 * These functions provide a clean interface for storing and retrieving profile data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStoredProfile,
  saveProfile,
  getApiUrl,
  getAllProfiles,
  deleteProfile,
  isExtensionContextValid,
  DEFAULT_WEB_APP_URL,
} from './storage';

// Mock chrome.storage API
const mockStorage: Record<string, unknown> = {};
const mockChrome = {
  storage: {
    sync: {
      get: vi.fn((keys: string[], callback: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        }
        callback(result);
      }),
      set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
        Object.assign(mockStorage, data);
        callback?.();
      }),
    },
  },
  runtime: {
    lastError: null as { message: string } | null,
    id: 'test-extension-id',
  },
};

// Set up global chrome mock
(globalThis as Record<string, unknown>).chrome = mockChrome;

describe('storage', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    mockChrome.runtime.lastError = null;
    mockChrome.runtime.id = 'test-extension-id';
    vi.clearAllMocks();
  });

  describe('exports', () => {
    it('exports getStoredProfile function', () => {
      expect(typeof getStoredProfile).toBe('function');
    });

    it('exports saveProfile function', () => {
      expect(typeof saveProfile).toBe('function');
    });

    it('exports getApiUrl function', () => {
      expect(typeof getApiUrl).toBe('function');
    });

    it('exports getAllProfiles function', () => {
      expect(typeof getAllProfiles).toBe('function');
    });

    it('exports deleteProfile function', () => {
      expect(typeof deleteProfile).toBe('function');
    });

    it('exports isExtensionContextValid function', () => {
      expect(typeof isExtensionContextValid).toBe('function');
    });

    it('exports DEFAULT_WEB_APP_URL constant', () => {
      expect(DEFAULT_WEB_APP_URL).toBe('https://www.socialrecall.now');
    });
  });

  describe('isExtensionContextValid', () => {
    it('returns true when chrome.runtime.id exists', () => {
      mockChrome.runtime.id = 'test-extension-id';
      expect(isExtensionContextValid()).toBe(true);
    });

    it('returns false when chrome.runtime.id is undefined', () => {
      mockChrome.runtime.id = undefined as unknown as string;
      expect(isExtensionContextValid()).toBe(false);
    });
  });

  describe('getStoredProfile', () => {
    it('returns null when profile does not exist', async () => {
      const result = await getStoredProfile('nonexistent');
      expect(result).toBeNull();
    });

    it('returns stored profile when it exists', async () => {
      mockStorage.socialNotes = {
        'john-doe': {
          name: 'John Doe',
          headline: 'Engineer',
          firstSeen: '2024-01-01',
          lastSeen: '2024-01-01',
        },
      };

      const result = await getStoredProfile('john-doe');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('John Doe');
      expect(result?.headline).toBe('Engineer');
    });

    it('returns null when chrome.runtime.lastError is set', async () => {
      mockChrome.runtime.lastError = { message: 'Storage error' };
      mockStorage.socialNotes = { 'john-doe': { name: 'John' } };

      const result = await getStoredProfile('john-doe');
      expect(result).toBeNull();
    });

    it('returns null when extension context is invalid', async () => {
      mockChrome.runtime.id = undefined as unknown as string;
      mockStorage.socialNotes = { 'john-doe': { name: 'John' } };

      const result = await getStoredProfile('john-doe');
      expect(result).toBeNull();
    });
  });

  describe('saveProfile', () => {
    it('saves new profile to storage', async () => {
      const profile = {
        name: 'Jane Smith',
        headline: 'Designer',
        firstSeen: '2024-01-01',
        lastSeen: '2024-01-01',
      };

      await saveProfile('jane-smith', profile as Parameters<typeof saveProfile>[1]);

      expect(mockStorage.socialNotes).toBeDefined();
      expect((mockStorage.socialNotes as Record<string, unknown>)['jane-smith']).toEqual(profile);
    });

    it('updates existing profile in storage', async () => {
      mockStorage.socialNotes = {
        'john-doe': { name: 'John', headline: 'Old headline' },
      };

      const updatedProfile = {
        name: 'John Doe',
        headline: 'New headline',
        firstSeen: '2024-01-01',
        lastSeen: '2024-01-02',
      };

      await saveProfile('john-doe', updatedProfile as Parameters<typeof saveProfile>[1]);

      expect((mockStorage.socialNotes as Record<string, unknown>)['john-doe']).toEqual(updatedProfile);
    });

    it('preserves other profiles when saving', async () => {
      mockStorage.socialNotes = {
        'existing-user': { name: 'Existing', headline: 'User' },
      };

      await saveProfile('new-user', { name: 'New', headline: 'User', firstSeen: '2024-01-01', lastSeen: '2024-01-01' } as Parameters<typeof saveProfile>[1]);

      expect((mockStorage.socialNotes as Record<string, unknown>)['existing-user']).toBeDefined();
      expect((mockStorage.socialNotes as Record<string, unknown>)['new-user']).toBeDefined();
    });

    it('does nothing when extension context is invalid', async () => {
      mockChrome.runtime.id = undefined as unknown as string;

      await saveProfile('test', { name: 'Test', firstSeen: '2024-01-01', lastSeen: '2024-01-01' } as Parameters<typeof saveProfile>[1]);

      expect(mockChrome.storage.sync.get).not.toHaveBeenCalled();
    });
  });

  describe('getApiUrl', () => {
    it('returns stored URL when set', async () => {
      mockStorage.webAppUrl = 'https://custom.example.com';

      const result = await getApiUrl();
      expect(result).toBe('https://custom.example.com');
    });

    it('returns default URL when not set', async () => {
      const result = await getApiUrl();
      expect(result).toBe(DEFAULT_WEB_APP_URL);
    });
  });

  describe('getAllProfiles', () => {
    it('returns empty object when no profiles stored', async () => {
      const result = await getAllProfiles();
      expect(result).toEqual({});
    });

    it('returns all stored profiles', async () => {
      mockStorage.socialNotes = {
        'user-1': { name: 'User 1' },
        'user-2': { name: 'User 2' },
      };

      const result = await getAllProfiles();
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['user-1'].name).toBe('User 1');
      expect(result['user-2'].name).toBe('User 2');
    });

    it('returns empty object when extension context is invalid', async () => {
      mockChrome.runtime.id = undefined as unknown as string;
      mockStorage.socialNotes = { 'user-1': { name: 'User 1' } };

      const result = await getAllProfiles();
      expect(result).toEqual({});
    });
  });

  describe('deleteProfile', () => {
    it('removes profile from storage', async () => {
      mockStorage.socialNotes = {
        'user-1': { name: 'User 1' },
        'user-2': { name: 'User 2' },
      };

      await deleteProfile('user-1');

      expect((mockStorage.socialNotes as Record<string, unknown>)['user-1']).toBeUndefined();
      expect((mockStorage.socialNotes as Record<string, unknown>)['user-2']).toBeDefined();
    });

    it('does nothing when profile does not exist', async () => {
      mockStorage.socialNotes = {
        'user-1': { name: 'User 1' },
      };

      await deleteProfile('nonexistent');

      expect((mockStorage.socialNotes as Record<string, unknown>)['user-1']).toBeDefined();
    });

    it('does nothing when extension context is invalid', async () => {
      mockChrome.runtime.id = undefined as unknown as string;
      mockStorage.socialNotes = { 'user-1': { name: 'User 1' } };

      await deleteProfile('user-1');

      expect(mockChrome.storage.sync.get).not.toHaveBeenCalled();
    });
  });
});
