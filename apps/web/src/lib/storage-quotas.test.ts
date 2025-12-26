/**
 * Tests for storage quota limits
 * Prevents database bloat by limiting contacts and notes per user
 */

import { describe, it, expect } from 'vitest';
import {
  STORAGE_QUOTAS,
  checkContactQuota,
  checkNoteQuota,
  QuotaCheckResult,
} from './storage-quotas';

describe('Storage Quotas', () => {
  describe('STORAGE_QUOTAS constants', () => {
    it('defines maximum contacts per user', () => {
      expect(STORAGE_QUOTAS.MAX_CONTACTS_PER_USER).toBeGreaterThan(0);
      expect(STORAGE_QUOTAS.MAX_CONTACTS_PER_USER).toBeLessThanOrEqual(10000);
    });

    it('defines maximum notes per contact', () => {
      expect(STORAGE_QUOTAS.MAX_NOTES_PER_CONTACT).toBeGreaterThan(0);
      expect(STORAGE_QUOTAS.MAX_NOTES_PER_CONTACT).toBeLessThanOrEqual(1000);
    });

    it('defines maximum total notes per user', () => {
      expect(STORAGE_QUOTAS.MAX_TOTAL_NOTES_PER_USER).toBeGreaterThan(0);
    });
  });

  describe('checkContactQuota', () => {
    it('allows when under limit', async () => {
      const mockGetCount = async () => 100;
      const result = await checkContactQuota(mockGetCount);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(100);
      expect(result.limit).toBe(STORAGE_QUOTAS.MAX_CONTACTS_PER_USER);
    });

    it('blocks when at limit', async () => {
      const mockGetCount = async () => STORAGE_QUOTAS.MAX_CONTACTS_PER_USER;
      const result = await checkContactQuota(mockGetCount);

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('contact limit');
    });

    it('blocks when over limit', async () => {
      const mockGetCount = async () => STORAGE_QUOTAS.MAX_CONTACTS_PER_USER + 100;
      const result = await checkContactQuota(mockGetCount);

      expect(result.allowed).toBe(false);
    });

    it('reports remaining capacity', async () => {
      const mockGetCount = async () => 500;
      const result = await checkContactQuota(mockGetCount);

      expect(result.remaining).toBe(STORAGE_QUOTAS.MAX_CONTACTS_PER_USER - 500);
    });
  });

  describe('checkNoteQuota', () => {
    it('allows when under per-contact limit', async () => {
      const mockGetContactNoteCount = async () => 5;
      const mockGetTotalNoteCount = async () => 100;

      const result = await checkNoteQuota(mockGetContactNoteCount, mockGetTotalNoteCount);

      expect(result.allowed).toBe(true);
    });

    it('blocks when at per-contact limit', async () => {
      const mockGetContactNoteCount = async () => STORAGE_QUOTAS.MAX_NOTES_PER_CONTACT;
      const mockGetTotalNoteCount = async () => 100;

      const result = await checkNoteQuota(mockGetContactNoteCount, mockGetTotalNoteCount);

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('notes per contact');
    });

    it('blocks when at total notes limit', async () => {
      const mockGetContactNoteCount = async () => 5;
      const mockGetTotalNoteCount = async () => STORAGE_QUOTAS.MAX_TOTAL_NOTES_PER_USER;

      const result = await checkNoteQuota(mockGetContactNoteCount, mockGetTotalNoteCount);

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('total notes');
    });

    it('reports remaining capacity for per-contact', async () => {
      const mockGetContactNoteCount = async () => 10;
      const mockGetTotalNoteCount = async () => 100;

      const result = await checkNoteQuota(mockGetContactNoteCount, mockGetTotalNoteCount);

      expect(result.remainingPerContact).toBe(STORAGE_QUOTAS.MAX_NOTES_PER_CONTACT - 10);
    });
  });
});
