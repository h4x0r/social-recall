import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getProfileCount,
  incrementProfileCount,
  isWithinFreeLimit,
  FREE_PROFILE_LIMIT,
  isAuthenticated,
  shouldShowGate,
} from './onboarding';

// Mock chrome.storage.sync
const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    sync: {
      get: vi.fn((keys: string[], callback: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        keys.forEach((key) => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        });
        callback(result);
      }),
      set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
        Object.assign(mockStorage, data);
        callback?.();
      }),
    },
  },
});

describe('Onboarding', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('FREE_PROFILE_LIMIT', () => {
    it('is set to 10', () => {
      expect(FREE_PROFILE_LIMIT).toBe(10);
    });
  });

  describe('getProfileCount', () => {
    it('returns 0 when no profiles tracked', async () => {
      const count = await getProfileCount();
      expect(count).toBe(0);
    });

    it('returns stored count when profiles exist', async () => {
      mockStorage.profileCount = 5;
      const count = await getProfileCount();
      expect(count).toBe(5);
    });
  });

  describe('incrementProfileCount', () => {
    it('increments count from 0 to 1', async () => {
      const newCount = await incrementProfileCount();
      expect(newCount).toBe(1);
      expect(mockStorage.profileCount).toBe(1);
    });

    it('increments existing count', async () => {
      mockStorage.profileCount = 7;
      const newCount = await incrementProfileCount();
      expect(newCount).toBe(8);
      expect(mockStorage.profileCount).toBe(8);
    });
  });

  describe('isWithinFreeLimit', () => {
    it('returns true when count is 0', async () => {
      expect(await isWithinFreeLimit()).toBe(true);
    });

    it('returns true when count is 9', async () => {
      mockStorage.profileCount = 9;
      expect(await isWithinFreeLimit()).toBe(true);
    });

    it('returns true when count is exactly 10', async () => {
      mockStorage.profileCount = 10;
      expect(await isWithinFreeLimit()).toBe(true);
    });

    it('returns false when count is 11', async () => {
      mockStorage.profileCount = 11;
      expect(await isWithinFreeLimit()).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no sync token', async () => {
      expect(await isAuthenticated()).toBe(false);
    });

    it('returns false when sync token is empty', async () => {
      mockStorage.syncToken = '';
      expect(await isAuthenticated()).toBe(false);
    });

    it('returns true when sync token exists', async () => {
      mockStorage.syncToken = 'valid-token-123';
      expect(await isAuthenticated()).toBe(true);
    });
  });

  describe('shouldShowGate', () => {
    it('returns false when within free limit', async () => {
      mockStorage.profileCount = 5;
      expect(await shouldShowGate()).toBe(false);
    });

    it('returns false when at exactly 10 profiles', async () => {
      mockStorage.profileCount = 10;
      expect(await shouldShowGate()).toBe(false);
    });

    it('returns true when over limit and not authenticated', async () => {
      mockStorage.profileCount = 11;
      expect(await shouldShowGate()).toBe(true);
    });

    it('returns false when over limit but authenticated', async () => {
      mockStorage.profileCount = 15;
      mockStorage.syncToken = 'valid-token-123';
      expect(await shouldShowGate()).toBe(false);
    });
  });
});
