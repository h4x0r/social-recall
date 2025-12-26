/**
 * Tests for sync functionality with contribution tracking
 * Tests the integration between sync, contributions, and avatar storage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSyncService,
  type SyncService,
  type ProfileSyncInput,
} from './sync-with-contributions';

// Mock dependencies
vi.mock('./r2-storage', () => ({
  downloadAndUploadAvatar: vi.fn(),
  getAvatarUrl: vi.fn(),
}));

vi.mock('./contribution-service', () => ({
  createContributionService: vi.fn(() => mockContributionService),
}));

const mockContributionService = {
  recordContribution: vi.fn(),
  checkForConflicts: vi.fn(),
  checkForRollback: vi.fn(),
};

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

import { downloadAndUploadAvatar, getAvatarUrl } from './r2-storage';

describe('SyncService with Contributions', () => {
  let service: SyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createSyncService(mockSupabase as never);

    // Default mock implementations
    (downloadAndUploadAvatar as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      path: 'avatars/john-doe.jpg',
    });
    (getAvatarUrl as ReturnType<typeof vi.fn>).mockReturnValue(
      'https://pub-test.r2.dev/avatars/john-doe.jpg'
    );
    mockContributionService.checkForConflicts.mockResolvedValue({ hasConflict: false });
    mockContributionService.checkForRollback.mockResolvedValue({ isRollback: false });
    mockContributionService.recordContribution.mockResolvedValue({ success: true });
  });

  describe('syncProfile', () => {
    it('creates new profile and records contributions', async () => {
      // Mock: profile doesn't exist yet
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'master_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'profile-1',
                    linkedin_id: 'john-doe',
                    name: 'John Doe',
                    headline: 'Software Engineer',
                    avatar_path: 'avatars/john-doe.jpg',
                    created_at: '2024-12-24T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_profile_data') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'upd-1', user_id: 'user-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const input: ProfileSyncInput = {
        userId: 'user-1',
        linkedinId: 'john-doe',
        name: 'John Doe',
        headline: 'Software Engineer',
        avatarUrl: 'https://linkedin.com/photo.jpg',
      };

      const result = await service.syncProfile(input);

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(true);
      expect(downloadAndUploadAvatar).toHaveBeenCalledWith(
        'john-doe',
        'https://linkedin.com/photo.jpg'
      );
    });

    it('updates existing profile and tracks field changes', async () => {
      // Mock: profile exists with different headline
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'master_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'profile-1',
                    linkedin_id: 'john-doe',
                    name: 'John Doe',
                    headline: 'Old Title',
                    avatar_path: 'avatars/john-doe.jpg',
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'profile-1',
                      headline: 'New Title',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'user_profile_data') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'upd-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await service.syncProfile({
        userId: 'user-1',
        linkedinId: 'john-doe',
        name: 'John Doe',
        headline: 'New Title',
      });

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(false);
      expect(result.changedFields).toContain('headline');
      expect(mockContributionService.recordContribution).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'headline',
          value: 'New Title',
        })
      );
    });

    it('detects concurrent conflict and marks contribution as pending', async () => {
      mockContributionService.checkForConflicts.mockResolvedValue({
        hasConflict: true,
        conflictType: 'concurrent',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'master_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'profile-1',
                    headline: 'Current Value',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_profile_data') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'upd-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await service.syncProfile({
        userId: 'user-1',
        linkedinId: 'john-doe',
        name: 'John Doe',
        headline: 'Conflicting Value',
      });

      expect(result.success).toBe(true);
      expect(result.hasConflicts).toBe(true);
      expect(mockContributionService.recordContribution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        })
      );
    });

    it('downloads avatar to R2 when avatarUrl provided', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'master_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'profile-1', linkedin_id: 'jane-doe' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_profile_data') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'upd-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await service.syncProfile({
        userId: 'user-1',
        linkedinId: 'jane-doe',
        name: 'Jane Doe',
        avatarUrl: 'https://linkedin.com/jane-photo.jpg',
      });

      expect(downloadAndUploadAvatar).toHaveBeenCalledWith(
        'jane-doe',
        'https://linkedin.com/jane-photo.jpg'
      );
    });

    it('skips avatar download if no avatarUrl provided', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'master_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'profile-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_profile_data') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'upd-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await service.syncProfile({
        userId: 'user-1',
        linkedinId: 'no-avatar',
        name: 'No Avatar',
      });

      expect(downloadAndUploadAvatar).not.toHaveBeenCalled();
    });

    it('continues sync even if avatar download fails', async () => {
      (downloadAndUploadAvatar as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Download failed',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'master_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'profile-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_profile_data') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'upd-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await service.syncProfile({
        userId: 'user-1',
        linkedinId: 'fail-avatar',
        name: 'Fail Avatar',
        avatarUrl: 'https://linkedin.com/fail.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.avatarError).toBe('Download failed');
    });
  });

  describe('syncEmployers', () => {
    it('syncs employers and records contribution', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'master_profile_employers') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [
                  { id: 'emp-1', company: 'Acme Inc', title: 'Engineer' },
                ],
                error: null,
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await service.syncEmployers('profile-1', 'user-1', [
        { company: 'Acme Inc', title: 'Engineer', isCurrent: true },
      ]);

      expect(result.success).toBe(true);
      expect(mockContributionService.recordContribution).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'employers',
        })
      );
    });
  });
});
