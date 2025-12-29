/**
 * Tests for consent storage module
 * TDD: Write tests first, watch them fail, then implement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};
const mockChrome = {
  storage: {
    local: {
      get: vi.fn((keys: string[]) => {
        const result: Record<string, unknown> = {};
        keys.forEach(key => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        });
        return Promise.resolve(result);
      }),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string[]) => {
        keys.forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    id: 'test-extension-id',
  },
  tabs: {
    create: vi.fn(),
  },
};

vi.stubGlobal('chrome', mockChrome);

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import {
  getConsent,
  hasLocalConsent,
  checkServerConsent,
  grantConsent,
  clearLocalConsent,
  openPrivacyPage,
  getConsentTextHash,
  CONSENT_TEXT,
  type ConsentRecord,
} from './consent';

describe('Consent Storage Module', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('getConsent', () => {
    it('returns null when no consent exists', async () => {
      const result = await getConsent();
      expect(result).toBeNull();
    });

    it('returns consent record when consent exists', async () => {
      const consentRecord: ConsentRecord = {
        given: true,
        timestamp: '2025-12-29T14:32:00.000Z',
        extensionVersion: '0.0.7',
        consentTextVersion: 'abc123',
        consentId: 'consent-uuid-123',
      };
      mockStorage.consent = consentRecord;

      const result = await getConsent();
      expect(result).toEqual(consentRecord);
    });
  });

  describe('hasLocalConsent', () => {
    it('returns false when no consent exists', async () => {
      const result = await hasLocalConsent();
      expect(result).toBe(false);
    });

    it('returns false when consent was revoked', async () => {
      mockStorage.consent = {
        given: false,
        timestamp: '2025-12-29T14:32:00.000Z',
        consentId: 'test',
        revokedAt: '2025-12-30T10:00:00.000Z',
      };

      const result = await hasLocalConsent();
      expect(result).toBe(false);
    });

    it('returns true when consent is active', async () => {
      mockStorage.consent = {
        given: true,
        timestamp: '2025-12-29T14:32:00.000Z',
        consentId: 'test',
      };

      const result = await hasLocalConsent();
      expect(result).toBe(true);
    });
  });

  describe('checkServerConsent', () => {
    it('returns true when server says user has consent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasConsent: true, consentId: 'uuid-123' }),
      });

      const result = await checkServerConsent('https://api.example.com', 'auth-token');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/consent/status',
        expect.objectContaining({
          headers: { Authorization: 'Bearer auth-token' },
        })
      );
    });

    it('returns false when server says user has no consent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasConsent: false }),
      });

      const result = await checkServerConsent('https://api.example.com', 'auth-token');
      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkServerConsent('https://api.example.com', 'auth-token');
      expect(result).toBe(false);
    });
  });

  describe('grantConsent', () => {
    it('logs consent to server and stores locally on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, consentId: 'consent-uuid-123' }),
      });

      const result = await grantConsent('https://api.example.com', 'auth-token');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/consent/log',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token',
          }),
        })
      );

      const storedConsent = mockStorage.consent as ConsentRecord;
      expect(storedConsent.given).toBe(true);
      expect(storedConsent.consentId).toBe('consent-uuid-123');
    });

    it('returns error on server failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const result = await grantConsent('https://api.example.com', 'auth-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
      expect(mockStorage.consent).toBeUndefined();
    });
  });

  describe('clearLocalConsent', () => {
    it('sets given to false and adds revokedAt', async () => {
      mockStorage.consent = {
        given: true,
        timestamp: '2025-12-29T14:32:00.000Z',
        extensionVersion: '0.0.7',
        consentTextVersion: 'abc123',
        consentId: 'consent-uuid-123',
      };

      await clearLocalConsent();

      const storedConsent = mockStorage.consent as ConsentRecord;
      expect(storedConsent.given).toBe(false);
      expect(storedConsent.revokedAt).toBeDefined();
      // Original fields preserved
      expect(storedConsent.timestamp).toBe('2025-12-29T14:32:00.000Z');
      expect(storedConsent.consentId).toBe('consent-uuid-123');
    });
  });

  describe('openPrivacyPage', () => {
    it('opens privacy page with revoke-consent anchor', () => {
      openPrivacyPage('https://www.socialrecall.now');

      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://www.socialrecall.now/privacy#revoke-consent',
      });
    });
  });

  describe('getConsentTextHash', () => {
    it('returns consistent hash for same text', () => {
      const hash1 = getConsentTextHash();
      const hash2 = getConsentTextHash();
      expect(hash1).toBe(hash2);
    });

    it('returns non-empty string', () => {
      const hash = getConsentTextHash();
      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('CONSENT_TEXT', () => {
    it('contains authenticated proxy language', () => {
      expect(CONSENT_TEXT.toLowerCase()).toContain('authenticated proxy');
    });

    it('mentions data transmission to servers', () => {
      expect(CONSENT_TEXT.toLowerCase()).toContain('server');
    });
  });
});
