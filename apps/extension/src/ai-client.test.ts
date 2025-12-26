import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  inferIntelligence,
  type ProfileData,
  type IntelligenceResult,
} from './ai-client';

describe('inferIntelligence', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch;
  });

  const mockProfile: ProfileData = {
    name: 'Sarah Chen',
    headline: 'Senior Engineer @ Stripe',
    employers: [{ company: 'Stripe', logo: '' }],
  };

  describe('successful inference', () => {
    it('returns skills array from API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          skills: [{ name: 'TypeScript', category: 'Engineering', confidence: 0.9 }],
          archetype: 'builder',
          couldBe: ['Tech Advisor'],
          goodFor: ['Dev tools'],
        }),
      });

      const result = await inferIntelligence(mockProfile);

      expect(result.success).toBe(true);
      expect(result.skills).toHaveLength(1);
      expect(result.skills![0].name).toBe('TypeScript');
    });

    it('returns archetype from API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          skills: [],
          archetype: 'strategist',
          couldBe: [],
          goodFor: [],
        }),
      });

      const result = await inferIntelligence(mockProfile);

      expect(result.success).toBe(true);
      expect(result.archetype).toBe('strategist');
    });

    it('returns couldBe and goodFor arrays', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          skills: [],
          archetype: 'builder',
          couldBe: ['Co-founder', 'Tech Advisor'],
          goodFor: ['Dev tools', 'Fintech'],
        }),
      });

      const result = await inferIntelligence(mockProfile);

      expect(result.success).toBe(true);
      expect(result.couldBe).toContain('Co-founder');
      expect(result.goodFor).toContain('Fintech');
    });
  });

  describe('API call construction', () => {
    it('calls the correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          skills: [],
          archetype: 'builder',
          couldBe: [],
          goodFor: [],
        }),
      });

      await inferIntelligence(mockProfile, { apiUrl: 'https://example.com' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/infer-skills',
        expect.any(Object)
      );
    });

    it('sends profile data in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          skills: [],
          archetype: 'builder',
          couldBe: [],
          goodFor: [],
        }),
      });

      await inferIntelligence(mockProfile);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.profile.name).toBe('Sarah Chen');
      expect(body.profile.headline).toBe('Senior Engineer @ Stripe');
    });

    it('uses default API URL when not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          skills: [],
          archetype: 'builder',
          couldBe: [],
          goodFor: [],
        }),
      });

      await inferIntelligence(mockProfile);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain('/api/infer-skills');
    });

    it('uses socialrecall.now as default API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          skills: [],
          archetype: 'builder',
          couldBe: [],
          goodFor: [],
        }),
      });

      await inferIntelligence(mockProfile);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('https://socialrecall.now/api/infer-skills');
    });
  });

  describe('error handling', () => {
    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await inferIntelligence(mockProfile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network');
    });

    it('returns error on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await inferIntelligence(mockProfile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('returns error when API returns success: false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Invalid profile data',
        }),
      });

      const result = await inferIntelligence(mockProfile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid profile data');
    });
  });

  describe('timeout handling', () => {
    it('times out after specified duration', async () => {
      // Simulate a slow API that never resolves by having the abort controller kick in
      let abortSignal: AbortSignal | undefined;
      mockFetch.mockImplementationOnce((_url: string, options: { signal?: AbortSignal }) => {
        abortSignal = options.signal;
        return new Promise((_, reject) => {
          if (abortSignal) {
            abortSignal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
      });

      const result = await inferIntelligence(mockProfile, { timeoutMs: 50 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });
});
