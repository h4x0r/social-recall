/**
 * Tests for CORS configuration
 * Ensures proper origin restrictions in production
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCorsHeaders, EXTENSION_ORIGINS } from './cors';

describe('CORS Configuration', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('getCorsHeaders', () => {
    it('returns wildcard in development', () => {
      process.env.NODE_ENV = 'development';
      const headers = getCorsHeaders();
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('returns extension origins in production', () => {
      process.env.NODE_ENV = 'production';
      const headers = getCorsHeaders();
      // Should be specific extension ID, not wildcard
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
      expect(headers['Access-Control-Allow-Origin']).toContain('chrome-extension://');
    });

    it('includes required headers', () => {
      const headers = getCorsHeaders();
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    });
  });

  describe('EXTENSION_ORIGINS', () => {
    it('contains valid chrome extension URLs', () => {
      for (const origin of EXTENSION_ORIGINS) {
        expect(origin).toMatch(/^chrome-extension:\/\/[a-z]{32}$/);
      }
    });
  });
});
