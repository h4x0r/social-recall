/**
 * Tests for admin authentication helper
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAdmin, requireAdmin } from './admin';

describe('admin helper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isAdmin', () => {
    it('returns true when email matches ADMIN_EMAIL', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      expect(isAdmin('admin@example.com')).toBe(true);
    });

    it('returns false when email does not match ADMIN_EMAIL', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      expect(isAdmin('user@example.com')).toBe(false);
    });

    it('returns false when ADMIN_EMAIL is not set', () => {
      delete process.env.ADMIN_EMAIL;
      expect(isAdmin('admin@example.com')).toBe(false);
    });

    it('returns false when email is null', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      expect(isAdmin(null)).toBe(false);
    });

    it('returns false when email is undefined', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      expect(isAdmin(undefined)).toBe(false);
    });

    it('is case-insensitive', () => {
      process.env.ADMIN_EMAIL = 'Admin@Example.com';
      expect(isAdmin('admin@example.com')).toBe(true);
    });
  });

  describe('requireAdmin', () => {
    it('returns true for admin email', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      expect(requireAdmin('admin@example.com')).toBe(true);
    });

    it('throws error for non-admin email', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      expect(() => requireAdmin('user@example.com')).toThrow('Forbidden');
    });

    it('throws error when email is null', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      expect(() => requireAdmin(null)).toThrow('Forbidden');
    });
  });
});
