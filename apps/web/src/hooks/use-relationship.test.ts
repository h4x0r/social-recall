/**
 * Tests for useRelationship hook
 * TDD: RED phase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRelationship } from './use-relationship';
import type { Relationship, RelationshipInput } from '@/lib/contact-repository';

// Mock the supabase client module
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

// Mock the contact repository
const mockRepository = {
  getRelationship: vi.fn(),
  addRelationship: vi.fn(),
  updateRelationship: vi.fn(),
  deleteRelationship: vi.fn(),
};

vi.mock('@/lib/contact-repository', async () => {
  const actual = await vi.importActual('@/lib/contact-repository');
  return {
    ...actual,
    createContactRepository: () => mockRepository,
  };
});

describe('useRelationship', () => {
  const contactId = 'contact-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository.getRelationship.mockResolvedValue(null);
  });

  it('starts with loading state', () => {
    const { result } = renderHook(() => useRelationship(contactId));
    expect(result.current.isLoading).toBe(true);
  });

  it('loads null when no relationship exists', async () => {
    mockRepository.getRelationship.mockResolvedValue(null);

    const { result } = renderHook(() => useRelationship(contactId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.relationship).toBeNull();
  });

  it('loads existing relationship', async () => {
    const mockRelationship: Relationship = {
      id: 'rel-1',
      contactId: 'contact-123',
      type: 'intro',
      context: null,
      introducedById: 'contact-456',
      introducedByName: 'Sarah Chen',
      sharedCompany: null,
      relationshipDate: '2024-01-15',
      strength: 3,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    };

    mockRepository.getRelationship.mockResolvedValue(mockRelationship);

    const { result } = renderHook(() => useRelationship(contactId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.relationship).toEqual(mockRelationship);
  });

  it('adds a relationship', async () => {
    const input: RelationshipInput = {
      type: 'conference',
      context: 'TechCrunch Disrupt 2024',
      strength: 2,
    };

    const newRelationship: Relationship = {
      id: 'rel-new',
      contactId,
      type: 'conference',
      context: 'TechCrunch Disrupt 2024',
      introducedById: null,
      introducedByName: null,
      sharedCompany: null,
      relationshipDate: null,
      strength: 2,
      createdAt: '2024-09-15',
      updatedAt: '2024-09-15',
    };

    mockRepository.addRelationship.mockResolvedValue(newRelationship);

    const { result } = renderHook(() => useRelationship(contactId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addRelationship(input);
    });

    expect(mockRepository.addRelationship).toHaveBeenCalledWith(contactId, input);
    expect(result.current.relationship).toEqual(newRelationship);
  });

  it('updates a relationship', async () => {
    const existingRelationship: Relationship = {
      id: 'rel-1',
      contactId,
      type: 'intro',
      context: null,
      introducedById: 'contact-456',
      introducedByName: 'Sarah Chen',
      sharedCompany: null,
      relationshipDate: null,
      strength: 3,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    };

    const updatedRelationship: Relationship = {
      ...existingRelationship,
      strength: 5,
      updatedAt: '2024-09-15',
    };

    mockRepository.getRelationship.mockResolvedValue(existingRelationship);
    mockRepository.updateRelationship.mockResolvedValue(updatedRelationship);

    const { result } = renderHook(() => useRelationship(contactId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateRelationship({ strength: 5 });
    });

    expect(mockRepository.updateRelationship).toHaveBeenCalledWith('rel-1', { strength: 5 });
    expect(result.current.relationship?.strength).toBe(5);
  });

  it('deletes a relationship', async () => {
    const existingRelationship: Relationship = {
      id: 'rel-1',
      contactId,
      type: 'intro',
      context: null,
      introducedById: null,
      introducedByName: null,
      sharedCompany: null,
      relationshipDate: null,
      strength: 3,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    };

    mockRepository.getRelationship.mockResolvedValue(existingRelationship);
    mockRepository.deleteRelationship.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRelationship(contactId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteRelationship();
    });

    expect(mockRepository.deleteRelationship).toHaveBeenCalledWith('rel-1');
    expect(result.current.relationship).toBeNull();
  });

  it('handles errors gracefully', async () => {
    mockRepository.getRelationship.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useRelationship(contactId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('sets saving state during add', async () => {
    mockRepository.addRelationship.mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useRelationship(contactId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addRelationship({ type: 'conference' });
    });

    expect(result.current.isSaving).toBe(true);
  });
});
