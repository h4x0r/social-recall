import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTags } from './use-tags';

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {},
  createTagRepository: vi.fn(),
}));

// Mock useAuth
vi.mock('./use-auth', () => ({
  useAuth: vi.fn(),
}));

import { createTagRepository } from '@/lib/supabase';
import { useAuth } from './use-auth';

describe('useTags', () => {
  const mockUser = { id: 'user-1', email: 'test@example.com' };

  let mockRepository: {
    createTag: ReturnType<typeof vi.fn>;
    listTags: ReturnType<typeof vi.fn>;
    deleteTag: ReturnType<typeof vi.fn>;
    addTagToContact: ReturnType<typeof vi.fn>;
    removeTagFromContact: ReturnType<typeof vi.fn>;
    getContactTags: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      createTag: vi.fn(),
      listTags: vi.fn().mockResolvedValue([]),
      deleteTag: vi.fn().mockResolvedValue(undefined),
      addTagToContact: vi.fn().mockResolvedValue(undefined),
      removeTagFromContact: vi.fn().mockResolvedValue(undefined),
      getContactTags: vi.fn().mockResolvedValue([]),
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    (createTagRepository as ReturnType<typeof vi.fn>).mockReturnValue(mockRepository);
  });

  it('should start with loading state', () => {
    const { result } = renderHook(() => useTags());
    expect(result.current.isLoading).toBe(true);
  });

  it('should load tags for the authenticated user', async () => {
    const mockTags = [
      { id: 'tag-1', userId: 'user-1', name: 'Important', color: '#6366f1', createdAt: '2024-01-15T10:00:00Z' },
      { id: 'tag-2', userId: 'user-1', name: 'VIP', color: '#ef4444', createdAt: '2024-01-15T11:00:00Z' },
    ];
    mockRepository.listTags.mockResolvedValue(mockTags);

    const { result } = renderHook(() => useTags());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tags).toEqual(mockTags);
    expect(mockRepository.listTags).toHaveBeenCalledWith('user-1');
  });

  it('should create a new tag', async () => {
    const newTag = { id: 'tag-3', userId: 'user-1', name: 'Follow Up', color: '#22c55e', createdAt: '2024-01-15T12:00:00Z' };
    mockRepository.createTag.mockResolvedValue(newTag);

    const { result } = renderHook(() => useTags());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let createdTag: any;
    await act(async () => {
      createdTag = await result.current.createTag({ name: 'Follow Up', color: '#22c55e' });
    });

    expect(mockRepository.createTag).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'Follow Up',
      color: '#22c55e',
    });
    expect(createdTag).toEqual(newTag);
  });

  it('should delete a tag', async () => {
    mockRepository.listTags.mockResolvedValue([
      { id: 'tag-1', userId: 'user-1', name: 'Important', color: '#6366f1', createdAt: '2024-01-15T10:00:00Z' },
    ]);

    const { result } = renderHook(() => useTags());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteTag('tag-1');
    });

    expect(mockRepository.deleteTag).toHaveBeenCalledWith('tag-1');
  });

  it('should get tags for a specific contact', async () => {
    const contactTags = [
      { id: 'tag-1', userId: 'user-1', name: 'Important', color: '#6366f1', createdAt: '2024-01-15T10:00:00Z' },
    ];
    mockRepository.getContactTags.mockResolvedValue(contactTags);

    const { result } = renderHook(() => useTags({ contactId: 'contact-1' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.contactTags).toEqual(contactTags);
    expect(mockRepository.getContactTags).toHaveBeenCalledWith('contact-1');
  });

  it('should add a tag to a contact', async () => {
    const allTags = [
      { id: 'tag-1', userId: 'user-1', name: 'Important', color: '#6366f1', createdAt: '2024-01-15T10:00:00Z' },
    ];
    mockRepository.listTags.mockResolvedValue(allTags);

    const { result } = renderHook(() => useTags({ contactId: 'contact-1' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addTagToContact('tag-1');
    });

    expect(mockRepository.addTagToContact).toHaveBeenCalledWith('contact-1', 'tag-1');
  });

  it('should remove a tag from a contact', async () => {
    const contactTags = [
      { id: 'tag-1', userId: 'user-1', name: 'Important', color: '#6366f1', createdAt: '2024-01-15T10:00:00Z' },
    ];
    mockRepository.getContactTags.mockResolvedValue(contactTags);

    const { result } = renderHook(() => useTags({ contactId: 'contact-1' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.removeTagFromContact('tag-1');
    });

    expect(mockRepository.removeTagFromContact).toHaveBeenCalledWith('contact-1', 'tag-1');
  });

  it('should handle errors gracefully', async () => {
    mockRepository.listTags.mockRejectedValue(new Error('Failed to fetch tags'));

    const { result } = renderHook(() => useTags());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch tags');
  });
});
