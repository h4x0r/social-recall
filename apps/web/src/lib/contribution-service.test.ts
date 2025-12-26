/**
 * Tests for Contribution Service
 * Handles tracking contributions to master profiles with conflict detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createContributionService,
  type ContributionService,
  type ContributionInput,
  type ConflictCheckResult,
} from './contribution-service';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

describe('ContributionService', () => {
  let service: ContributionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createContributionService(mockSupabase as never);
  });

  describe('recordContribution', () => {
    it('records a new contribution for a field', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'contribution-1',
              master_profile_id: 'profile-1',
              contributed_by: 'user-1',
              field: 'headline',
              value: '"Software Engineer"',
              status: 'accepted',
              created_at: '2024-12-24T00:00:00Z',
            },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const input: ContributionInput = {
        masterProfileId: 'profile-1',
        contributedBy: 'user-1',
        field: 'headline',
        value: 'Software Engineer',
      };

      const result = await service.recordContribution(input);

      expect(result.success).toBe(true);
      expect(result.contribution?.field).toBe('headline');
      expect(mockSupabase.from).toHaveBeenCalledWith('master_profile_contributions');
    });

    it('handles contribution recording failure', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const result = await service.recordContribution({
        masterProfileId: 'profile-1',
        contributedBy: 'user-1',
        field: 'name',
        value: 'John Doe',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('checkForConflicts', () => {
    it('returns no conflict when no recent contributions exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.checkForConflicts(
        'profile-1',
        'headline',
        'New Headline'
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflictType).toBeUndefined();
    });

    it('detects concurrent contribution conflict within 24h', async () => {
      const recentTime = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours ago

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'contribution-1',
                      contributed_by: 'other-user',
                      value: '"Different Headline"',
                      status: 'accepted',
                      created_at: recentTime,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.checkForConflicts(
        'profile-1',
        'headline',
        'New Headline'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('concurrent');
      expect(result.existingContributions).toHaveLength(1);
    });

    it('detects rollback conflict when new value matches older value', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'contribution-2',
                    value: '"Current Value"',
                    status: 'accepted',
                    created_at: '2024-12-23T00:00:00Z',
                  },
                  {
                    id: 'contribution-1',
                    value: '"Old Value"',
                    status: 'accepted',
                    created_at: '2024-12-20T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.checkForRollback('profile-1', 'headline', 'Old Value');

      expect(result.isRollback).toBe(true);
      expect(result.rollingBackTo?.value).toBe('"Old Value"');
    });

    it('returns no rollback when value is new', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'contribution-1',
                    value: '"Completely Different"',
                    status: 'accepted',
                    created_at: '2024-12-20T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.checkForRollback(
        'profile-1',
        'headline',
        'Brand New Value'
      );

      expect(result.isRollback).toBe(false);
    });
  });

  describe('getContributionHistory', () => {
    it('returns contribution history for a profile field', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'c1',
                    field: 'headline',
                    value: '"Latest"',
                    status: 'accepted',
                    created_at: '2024-12-24T00:00:00Z',
                    contributed_by: 'user-1',
                  },
                  {
                    id: 'c2',
                    field: 'headline',
                    value: '"Previous"',
                    status: 'accepted',
                    created_at: '2024-12-23T00:00:00Z',
                    contributed_by: 'user-2',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      });

      const history = await service.getContributionHistory('profile-1', 'headline');

      expect(history).toHaveLength(2);
      expect(history[0].value).toBe('"Latest"');
    });

    it('returns all contributions when no field filter', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'c1', field: 'headline', value: '"H"' },
                { id: 'c2', field: 'name', value: '"N"' },
                { id: 'c3', field: 'location', value: '"L"' },
              ],
              error: null,
            }),
          }),
        }),
      });

      const history = await service.getContributionHistory('profile-1');

      expect(history).toHaveLength(3);
    });
  });

  describe('resolveConflict', () => {
    it('marks a contribution as accepted', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'contribution-1',
                  status: 'accepted',
                  resolved_by: 'admin-1',
                  resolved_at: '2024-12-24T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.resolveConflict('contribution-1', 'admin-1', 'accepted');

      expect(result.success).toBe(true);
      expect(result.contribution?.status).toBe('accepted');
    });

    it('marks a contribution as rejected', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'contribution-1',
                  status: 'rejected',
                  resolved_by: 'admin-1',
                  resolved_at: '2024-12-24T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.resolveConflict('contribution-1', 'admin-1', 'rejected');

      expect(result.success).toBe(true);
      expect(result.contribution?.status).toBe('rejected');
    });
  });

  describe('getPendingConflicts', () => {
    it('returns all pending contributions', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'c1', status: 'pending', field: 'headline' },
                { id: 'c2', status: 'pending', field: 'name' },
              ],
              error: null,
            }),
          }),
        }),
      });

      const pending = await service.getPendingConflicts();

      expect(pending).toHaveLength(2);
    });

    it('filters by master profile when provided', async () => {
      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'c1', status: 'pending' }],
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEq }),
      });

      await service.getPendingConflicts('profile-1');

      expect(mockEq).toHaveBeenCalled();
    });
  });
});
