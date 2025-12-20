/**
 * Tests for useSkillInference hook
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSkillInference } from './use-skill-inference';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('useSkillInference', () => {
  const mockProfile = {
    id: 'profile-123',
    name: 'John Doe',
    headline: 'Software Engineer at Google',
    employers: [{ company: 'Google', logo: '' }],
  };

  const mockSkills = [
    { name: 'Python', category: 'Engineering', confidence: 0.9 },
    { name: 'Cloud Architecture', category: 'Enterprise Tech', confidence: 0.8 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns idle state when no profile provided', () => {
      const { result } = renderHook(() => useSkillInference());

      expect(result.current.status).toBe('idle');
      expect(result.current.skills).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('inferSkills', () => {
    it('transitions to loading state when inference starts', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true, skills: mockSkills }),
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useSkillInference());

      act(() => {
        result.current.inferSkills(mockProfile);
      });

      expect(result.current.status).toBe('loading');
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.status).toBe('success'));
    });

    it('calls API with correct profile data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, skills: mockSkills }),
      });

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/infer-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            name: mockProfile.name,
            headline: mockProfile.headline,
            employers: mockProfile.employers,
          },
        }),
      });
    });

    it('returns inferred skills on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, skills: mockSkills }),
      });

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile);
      });

      expect(result.current.status).toBe('success');
      expect(result.current.skills).toEqual(mockSkills);
      expect(result.current.error).toBeNull();
    });

    it('handles API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.skills).toBeNull();
      expect(result.current.error).toBe('Server error');
    });

    it('handles network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Network error');
    });

    it('handles API returning success: false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'ANTHROPIC_API_KEY not configured',
          }),
      });

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('ANTHROPIC_API_KEY not configured');
    });
  });

  describe('caching', () => {
    it('caches skills in localStorage after successful inference', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, skills: mockSkills }),
      });

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile);
      });

      const cached = localStorageMock.getItem(`skills:${mockProfile.id}`);
      expect(cached).not.toBeNull();

      const parsed = JSON.parse(cached!);
      expect(parsed.skills).toEqual(mockSkills);
      expect(parsed.profileId).toBe(mockProfile.id);
    });

    it('returns cached skills without calling API', async () => {
      // Pre-populate cache
      const cachedData = {
        profileId: mockProfile.id,
        skills: mockSkills,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      };
      localStorageMock.setItem(`skills:${mockProfile.id}`, JSON.stringify(cachedData));

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.skills).toEqual(mockSkills);
      expect(result.current.status).toBe('success');
    });

    it('ignores expired cache and calls API', async () => {
      // Pre-populate with expired cache
      const expiredCache = {
        profileId: mockProfile.id,
        skills: [{ name: 'Old Skill', category: 'Engineering', confidence: 0.5 }],
        cachedAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // expired 1 day ago
      };
      localStorageMock.setItem(`skills:${mockProfile.id}`, JSON.stringify(expiredCache));

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, skills: mockSkills }),
      });

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile);
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(result.current.skills).toEqual(mockSkills);
    });

    it('allows force refresh to bypass cache', async () => {
      // Pre-populate cache
      const cachedData = {
        profileId: mockProfile.id,
        skills: [{ name: 'Cached Skill', category: 'Engineering', confidence: 0.5 }],
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      localStorageMock.setItem(`skills:${mockProfile.id}`, JSON.stringify(cachedData));

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, skills: mockSkills }),
      });

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile, { forceRefresh: true });
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(result.current.skills).toEqual(mockSkills);
    });
  });

  describe('reset', () => {
    it('resets state to idle', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, skills: mockSkills }),
      });

      const { result } = renderHook(() => useSkillInference());

      await act(async () => {
        await result.current.inferSkills(mockProfile);
      });

      expect(result.current.status).toBe('success');

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.skills).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
