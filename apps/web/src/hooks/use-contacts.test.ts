/**
 * Tests for useContacts hook
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useContacts } from './use-contacts';

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
  createContactRepository: vi.fn(),
}));

// Mock useAuth
vi.mock('./use-auth', () => ({
  useAuth: vi.fn(),
}));

import { supabase, createContactRepository } from '@/lib/supabase';
import { useAuth } from './use-auth';

describe('useContacts', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockContacts = [
    {
      id: 'contact-1',
      userId: 'user-123',
      linkedinId: 'john-doe',
      name: 'John Doe',
      headline: 'CEO @ Startup',
      isNew: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    },
    {
      id: 'contact-2',
      userId: 'user-123',
      linkedinId: 'jane-smith',
      name: 'Jane Smith',
      headline: 'CTO @ TechCorp',
      isNew: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  let mockRepository: {
    listContacts: ReturnType<typeof vi.fn>;
    getContact: ReturnType<typeof vi.fn>;
    updateContact: ReturnType<typeof vi.fn>;
    deleteContact: ReturnType<typeof vi.fn>;
    markContactAsSeen: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      listContacts: vi.fn().mockResolvedValue(mockContacts),
      getContact: vi.fn(),
      updateContact: vi.fn(),
      deleteContact: vi.fn(),
      markContactAsSeen: vi.fn(),
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    (createContactRepository as ReturnType<typeof vi.fn>).mockReturnValue(mockRepository);
  });

  describe('fetching contacts', () => {
    it('fetches contacts on mount when authenticated', async () => {
      const { result } = renderHook(() => useContacts());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.listContacts).toHaveBeenCalledWith('user-123', {});
      expect(result.current.contacts).toHaveLength(2);
      expect(result.current.contacts[0].name).toBe('John Doe');
    });

    it('does not fetch when not authenticated', async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const { result } = renderHook(() => useContacts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.listContacts).not.toHaveBeenCalled();
      expect(result.current.contacts).toHaveLength(0);
    });

    it('filters contacts by isNew', async () => {
      const { result } = renderHook(() => useContacts({ isNew: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.listContacts).toHaveBeenCalledWith('user-123', {
        isNew: true,
      });
    });

    it('searches contacts by query', async () => {
      const { result } = renderHook(() => useContacts({ search: 'John' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.listContacts).toHaveBeenCalledWith('user-123', {
        search: 'John',
      });
    });

    it('handles fetch errors gracefully', async () => {
      mockRepository.listContacts.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useContacts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.contacts).toHaveLength(0);
    });
  });

  describe('refresh', () => {
    it('refetches contacts on refresh', async () => {
      const { result } = renderHook(() => useContacts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.listContacts).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRepository.listContacts).toHaveBeenCalledTimes(2);
    });
  });

  describe('markAsSeen', () => {
    it('marks a contact as seen', async () => {
      mockRepository.markContactAsSeen.mockResolvedValue(undefined);

      const { result } = renderHook(() => useContacts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.markAsSeen('contact-1');
      });

      expect(mockRepository.markContactAsSeen).toHaveBeenCalledWith('contact-1');
    });

    it('updates local state after marking as seen', async () => {
      mockRepository.markContactAsSeen.mockResolvedValue(undefined);

      const { result } = renderHook(() => useContacts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.contacts[0].isNew).toBe(true);

      await act(async () => {
        await result.current.markAsSeen('contact-1');
      });

      expect(result.current.contacts[0].isNew).toBe(false);
    });
  });

  describe('deleteContact', () => {
    it('deletes a contact', async () => {
      mockRepository.deleteContact.mockResolvedValue(undefined);

      const { result } = renderHook(() => useContacts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteContact('contact-1');
      });

      expect(mockRepository.deleteContact).toHaveBeenCalledWith('contact-1');
    });

    it('removes contact from local state after delete', async () => {
      mockRepository.deleteContact.mockResolvedValue(undefined);

      const { result } = renderHook(() => useContacts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.contacts).toHaveLength(2);

      await act(async () => {
        await result.current.deleteContact('contact-1');
      });

      expect(result.current.contacts).toHaveLength(1);
      expect(result.current.contacts[0].id).toBe('contact-2');
    });
  });

  describe('computed values', () => {
    it('calculates total count', async () => {
      const { result } = renderHook(() => useContacts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalCount).toBe(2);
    });

    it('calculates new count', async () => {
      const { result } = renderHook(() => useContacts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.newCount).toBe(1);
    });
  });
});
