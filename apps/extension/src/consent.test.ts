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
};

vi.stubGlobal('chrome', mockChrome);

// Import after mocking
import {
  getConsent,
  setConsent,
  revokeConsent,
  hasConsent,
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
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        serverLogId: 'uuid-123',
      };
      mockStorage.consent = consentRecord;

      const result = await getConsent();
      expect(result).toEqual(consentRecord);
    });
  });

  describe('setConsent', () => {
    it('stores consent record with all required fields', async () => {
      const serverResponse = {
        ip: '192.168.1.1',
        logId: 'uuid-123',
      };

      await setConsent(serverResponse);

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
      const storedConsent = mockStorage.consent as ConsentRecord;

      expect(storedConsent.given).toBe(true);
      expect(storedConsent.timestamp).toBeDefined();
      expect(storedConsent.extensionVersion).toBeDefined();
      expect(storedConsent.consentTextVersion).toBeDefined();
      expect(storedConsent.userAgent).toBeDefined();
      expect(storedConsent.ip).toBe('192.168.1.1');
      expect(storedConsent.serverLogId).toBe('uuid-123');
    });

    it('generates consent text version hash', async () => {
      await setConsent({ ip: '1.2.3.4', logId: 'test' });

      const storedConsent = mockStorage.consent as ConsentRecord;
      expect(storedConsent.consentTextVersion).toBeTruthy();
      expect(typeof storedConsent.consentTextVersion).toBe('string');
    });
  });

  describe('revokeConsent', () => {
    it('sets given to false but preserves record', async () => {
      mockStorage.consent = {
        given: true,
        timestamp: '2025-12-29T14:32:00.000Z',
        extensionVersion: '0.0.7',
        consentTextVersion: 'abc123',
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        serverLogId: 'uuid-123',
      };

      await revokeConsent();

      const storedConsent = mockStorage.consent as ConsentRecord;
      expect(storedConsent.given).toBe(false);
      expect(storedConsent.revokedAt).toBeDefined();
      // Original fields preserved
      expect(storedConsent.timestamp).toBe('2025-12-29T14:32:00.000Z');
      expect(storedConsent.serverLogId).toBe('uuid-123');
    });
  });

  describe('hasConsent', () => {
    it('returns false when no consent exists', async () => {
      const result = await hasConsent();
      expect(result).toBe(false);
    });

    it('returns false when consent was revoked', async () => {
      mockStorage.consent = {
        given: false,
        timestamp: '2025-12-29T14:32:00.000Z',
        revokedAt: '2025-12-30T10:00:00.000Z',
      };

      const result = await hasConsent();
      expect(result).toBe(false);
    });

    it('returns true when consent is active', async () => {
      mockStorage.consent = {
        given: true,
        timestamp: '2025-12-29T14:32:00.000Z',
      };

      const result = await hasConsent();
      expect(result).toBe(true);
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
