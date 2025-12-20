/**
 * Tests for useOpportunities hook
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOpportunities } from './use-opportunities';

// Mock useAuth
vi.mock('./use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {},
  createOpportunityRepository: vi.fn(),
}));

import { useAuth } from './use-auth';
import { createOpportunityRepository } from '@/lib/supabase';

describe('useOpportunities', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockOpportunities = [
    {
      id: 'opp-1',
      contactId: 'contact-1',
      type: 'new_company' as const,
      description: 'Started new role at TechCorp',
      detectedAt: '2024-01-15T10:00:00Z',
      dismissed: false,
      snoozedUntil: null,
      contact: {
        id: 'contact-1',
        name: 'Sarah Chen',
        headline: 'Founder @ TechCorp',
      },
    },
    {
      id: 'opp-2',
      contactId: 'contact-2',
      type: 'role_change' as const,
      description: 'Now CTO at AI Startup',
      detectedAt: '2024-01-14T10:00:00Z',
      dismissed: false,
      snoozedUntil: null,
      contact: {
        id: 'contact-2',
        name: 'Marcus Johnson',
        headline: 'CTO @ AI Startup',
      },
    },
  ];

  let mockRepository: {
    listOpportunities: ReturnType<typeof vi.fn>;
    dismissOpportunity: ReturnType<typeof vi.fn>;
    snoozeOpportunity: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      listOpportunities: vi.fn().mockResolvedValue(mockOpportunities),
      dismissOpportunity: vi.fn().mockResolvedValue(undefined),
      snoozeOpportunity: vi.fn().mockResolvedValue(undefined),
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    (createOpportunityRepository as ReturnType<typeof vi.fn>).mockReturnValue(mockRepository);
  });

  describe('fetching opportunities', () => {
    it('fetches opportunities on mount when authenticated', async () => {
      const { result } = renderHook(() => useOpportunities());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.listOpportunities).toHaveBeenCalledWith('user-123', {});
      expect(result.current.opportunities).toHaveLength(2);
      expect(result.current.opportunities[0].contact.name).toBe('Sarah Chen');
    });

    it('does not fetch when not authenticated', async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.listOpportunities).not.toHaveBeenCalled();
      expect(result.current.opportunities).toHaveLength(0);
    });

    it('filters by opportunity type', async () => {
      const { result } = renderHook(() =>
        useOpportunities({ type: 'new_company' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.listOpportunities).toHaveBeenCalledWith('user-123', {
        type: 'new_company',
      });
    });

    it('handles fetch errors gracefully', async () => {
      mockRepository.listOpportunities.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.opportunities).toHaveLength(0);
    });
  });

  describe('refresh', () => {
    it('refetches opportunities on refresh', async () => {
      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.listOpportunities).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRepository.listOpportunities).toHaveBeenCalledTimes(2);
    });
  });

  describe('dismiss', () => {
    it('dismisses an opportunity', async () => {
      mockRepository.dismissOpportunity.mockResolvedValue(undefined);

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.dismiss('opp-1');
      });

      expect(mockRepository.dismissOpportunity).toHaveBeenCalledWith('opp-1');
    });

    it('removes opportunity from local state after dismiss', async () => {
      mockRepository.dismissOpportunity.mockResolvedValue(undefined);

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.opportunities).toHaveLength(2);

      await act(async () => {
        await result.current.dismiss('opp-1');
      });

      expect(result.current.opportunities).toHaveLength(1);
      expect(result.current.opportunities[0].id).toBe('opp-2');
    });
  });

  describe('snooze', () => {
    it('snoozes an opportunity for specified days', async () => {
      mockRepository.snoozeOpportunity.mockResolvedValue(undefined);

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.snooze('opp-1', 7);
      });

      expect(mockRepository.snoozeOpportunity).toHaveBeenCalledWith('opp-1', 7);
    });

    it('removes opportunity from local state after snooze', async () => {
      mockRepository.snoozeOpportunity.mockResolvedValue(undefined);

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.opportunities).toHaveLength(2);

      await act(async () => {
        await result.current.snooze('opp-1', 7);
      });

      expect(result.current.opportunities).toHaveLength(1);
    });
  });

  describe('computed values', () => {
    it('calculates total count', async () => {
      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalCount).toBe(2);
    });

    it('groups opportunities by type', async () => {
      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.countByType).toEqual({
        new_company: 1,
        role_change: 1,
        left_job: 0,
      });
    });
  });
});
