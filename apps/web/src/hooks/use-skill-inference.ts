"use client";

import { useState, useCallback } from 'react';

export interface InferredSkill {
  name: string;
  category: string;
  confidence: number;
}

export interface ProfileInput {
  id: string;
  name: string;
  headline: string | null;
  employers?: Array<{ company: string; logo: string }>;
  notes?: string;
}

export interface InferenceOptions {
  forceRefresh?: boolean;
}

interface CachedSkills {
  profileId: string;
  skills: InferredSkill[];
  cachedAt: string;
  expiresAt: string;
}

type InferenceStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseSkillInferenceReturn {
  status: InferenceStatus;
  skills: InferredSkill[] | null;
  error: string | null;
  isLoading: boolean;
  inferSkills: (profile: ProfileInput, options?: InferenceOptions) => Promise<void>;
  reset: () => void;
}

const CACHE_KEY_PREFIX = 'skills:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(profileId: string): string {
  return `${CACHE_KEY_PREFIX}${profileId}`;
}

function getCachedSkills(profileId: string): CachedSkills | null {
  try {
    const key = getCacheKey(profileId);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const data: CachedSkills = JSON.parse(cached);
    const now = new Date();
    const expiresAt = new Date(data.expiresAt);

    if (now > expiresAt) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setCachedSkills(profileId: string, skills: InferredSkill[]): void {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    const data: CachedSkills = {
      profileId,
      skills,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    localStorage.setItem(getCacheKey(profileId), JSON.stringify(data));
  } catch {
    // Ignore localStorage errors
  }
}

export function useSkillInference(): UseSkillInferenceReturn {
  const [status, setStatus] = useState<InferenceStatus>('idle');
  const [skills, setSkills] = useState<InferredSkill[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inferSkills = useCallback(
    async (profile: ProfileInput, options?: InferenceOptions) => {
      const { forceRefresh = false } = options || {};

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getCachedSkills(profile.id);
        if (cached) {
          setSkills(cached.skills);
          setStatus('success');
          setError(null);
          return;
        }
      }

      setStatus('loading');
      setError(null);

      try {
        const response = await fetch('/api/infer-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profile: {
              name: profile.name,
              headline: profile.headline,
              employers: profile.employers,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `HTTP error: ${response.status}`;
          setError(errorMessage);
          setStatus('error');
          return;
        }

        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Unknown error');
          setStatus('error');
          return;
        }

        setSkills(data.skills);
        setStatus('success');

        // Cache the results
        if (data.skills) {
          setCachedSkills(profile.id, data.skills);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        setError(errorMessage);
        setStatus('error');
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setSkills(null);
    setError(null);
  }, []);

  return {
    status,
    skills,
    error,
    isLoading: status === 'loading',
    inferSkills,
    reset,
  };
}
