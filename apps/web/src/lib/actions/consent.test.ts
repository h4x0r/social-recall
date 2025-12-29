/**
 * Tests for consent server actions
 * TDD: Write tests first, watch fail, implement minimal code
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    admin: {
      deleteUser: vi.fn(),
    },
  },
};

vi.mock('@/lib/supabase', () => ({
  createAdminClient: () => mockSupabase,
}));

import {
  logConsent,
  revokeConsent,
  hasConsent,
  deleteUserAndRevokeConsent,
} from './consent';

describe('consent actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logConsent', () => {
    it('inserts consent record with user_id', async () => {
      const insertMock = vi.fn().mockResolvedValue({ data: { id: 'consent-1' }, error: null });
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const result = await logConsent({
        userId: 'user-123',
        extensionVersion: '0.0.7',
        consentTextVersion: 'abc123',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('consent_logs');
      expect(insertMock).toHaveBeenCalledWith({
        user_id: 'user-123',
        extension_version: '0.0.7',
        consent_text_version: 'abc123',
        user_agent: 'Mozilla/5.0',
        given: true,
      });
      expect(result.success).toBe(true);
    });

    it('returns error when insert fails', async () => {
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const result = await logConsent({
        userId: 'user-123',
        extensionVersion: '0.0.7',
        consentTextVersion: 'abc123',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('revokeConsent', () => {
    it('sets revoked_at timestamp for user', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      const result = await revokeConsent('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('consent_logs');
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ revoked_at: expect.any(String) })
      );
      expect(result.success).toBe(true);
    });

    it('returns error when update fails', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
      });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      const result = await revokeConsent('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('hasConsent', () => {
    it('returns true when user has active consent', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'consent-1' }, error: null }),
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ select: selectMock });

      const result = await hasConsent('user-123');

      expect(result).toBe(true);
    });

    it('returns false when user has no consent record', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ select: selectMock });

      const result = await hasConsent('user-123');

      expect(result).toBe(false);
    });

    it('returns false when consent is revoked', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ select: selectMock });

      const result = await hasConsent('user-123');

      expect(result).toBe(false);
    });
  });

  describe('deleteUserAndRevokeConsent', () => {
    it('deletes user from auth.users', async () => {
      mockSupabase.auth.admin.deleteUser.mockResolvedValue({ data: {}, error: null });

      const result = await deleteUserAndRevokeConsent('user-123');

      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
      expect(result.success).toBe(true);
    });

    it('returns error when delete fails', async () => {
      mockSupabase.auth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' }
      });

      const result = await deleteUserAndRevokeConsent('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });
});
