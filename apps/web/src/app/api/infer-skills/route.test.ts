import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the 'ai' module before importing the route
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock rate limiter
vi.mock('@/lib/rate-limiter', () => ({
  getGlobalRateLimiter: vi.fn(() => ({
    isAllowed: vi.fn().mockReturnValue(true),
    getRemainingRequests: vi.fn().mockReturnValue(10),
    getResetTime: vi.fn().mockReturnValue(null),
  })),
}));

import { POST } from './route';
import { generateText } from 'ai';
import { getGlobalRateLimiter } from '@/lib/rate-limiter';

const mockGenerateText = generateText as ReturnType<typeof vi.fn>;
const mockGetGlobalRateLimiter = getGlobalRateLimiter as ReturnType<typeof vi.fn>;

function createRequest(body: unknown, ip?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ip) {
    headers['x-forwarded-for'] = ip;
  }
  return new Request('http://localhost/api/infer-skills', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/infer-skills', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('input validation', () => {
    it('returns 400 when profile is missing', async () => {
      const request = createRequest({});
      const response = await POST(request as never);
      expect(response.status).toBe(400);
    });

    it('returns 400 when name is missing', async () => {
      const request = createRequest({ profile: { headline: 'Engineer' } });
      const response = await POST(request as never);
      expect(response.status).toBe(400);
    });

    it('returns 400 when headline is missing', async () => {
      const request = createRequest({ profile: { name: 'John Doe' } });
      const response = await POST(request as never);
      expect(response.status).toBe(400);
    });
  });

  describe('skills extraction', () => {
    it('returns skills array from AI response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          skills: [
            { name: 'TypeScript', category: 'Engineering', confidence: 0.9 },
          ],
          archetype: 'builder',
          couldBe: ['Tech Advisor'],
          goodFor: ['Dev tools'],
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const request = createRequest({
        profile: { name: 'Sarah Chen', headline: 'Senior Engineer @ Stripe' },
      });
      const response = await POST(request as never);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.skills).toHaveLength(1);
      expect(data.skills[0].name).toBe('TypeScript');
    });
  });

  describe('full intelligence extraction', () => {
    it('returns archetype from AI response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          skills: [{ name: 'Go', category: 'Engineering', confidence: 0.9 }],
          archetype: 'builder',
          couldBe: ['Co-founder'],
          goodFor: ['Dev tools'],
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const request = createRequest({
        profile: { name: 'John Doe', headline: 'Staff Engineer @ Google' },
      });
      const response = await POST(request as never);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.archetype).toBe('builder');
    });

    it('returns couldBe array from AI response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          skills: [],
          archetype: 'strategist',
          couldBe: ['Advisor', 'Board Member', 'Mentor'],
          goodFor: ['Fintech'],
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const request = createRequest({
        profile: { name: 'Jane Smith', headline: 'CEO @ Fintech Startup' },
      });
      const response = await POST(request as never);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.couldBe).toContain('Advisor');
      expect(data.couldBe).toContain('Board Member');
    });

    it('returns goodFor array from AI response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          skills: [],
          archetype: 'designer',
          couldBe: ['Design Lead'],
          goodFor: ['Consumer Apps', 'Mobile', 'B2C'],
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const request = createRequest({
        profile: { name: 'Alex Kim', headline: 'Principal Designer @ Airbnb' },
      });
      const response = await POST(request as never);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.goodFor).toContain('Consumer Apps');
      expect(data.goodFor).toContain('Mobile');
    });

    it('validates archetype is one of the known archetypes', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          skills: [],
          archetype: 'invalid-archetype',
          couldBe: [],
          goodFor: [],
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const request = createRequest({
        profile: { name: 'Test User', headline: 'Unknown Role' },
      });
      const response = await POST(request as never);
      const data = await response.json();

      expect(data.success).toBe(true);
      // Should default to null or a fallback when invalid
      expect(data.archetype).toBeNull();
    });
  });

  describe('prompt construction', () => {
    it('includes archetype options in prompt', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          skills: [],
          archetype: 'builder',
          couldBe: [],
          goodFor: [],
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const request = createRequest({
        profile: { name: 'Test', headline: 'Engineer' },
      });
      await POST(request as never);

      const call = mockGenerateText.mock.calls[0][0];
      expect(call.prompt).toContain('builder');
      expect(call.prompt).toContain('architect');
      expect(call.prompt).toContain('designer');
    });

    it('includes relationship potential options in prompt', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          skills: [],
          archetype: 'builder',
          couldBe: [],
          goodFor: [],
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const request = createRequest({
        profile: { name: 'Test', headline: 'Engineer' },
      });
      await POST(request as never);

      const call = mockGenerateText.mock.calls[0][0];
      expect(call.prompt).toContain('couldBe');
      expect(call.prompt).toContain('goodFor');
    });
  });

  describe('error handling', () => {
    it('returns 502 when AI returns empty response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: '',
        usage: { inputTokens: 100, outputTokens: 0 },
      });

      const request = createRequest({
        profile: { name: 'Test', headline: 'Engineer' },
      });
      const response = await POST(request as never);

      expect(response.status).toBe(502);
    });

    it('returns 500 when AI call throws', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('API error'));

      const request = createRequest({
        profile: { name: 'Test', headline: 'Engineer' },
      });
      const response = await POST(request as never);

      expect(response.status).toBe(500);
    });
  });

  describe('rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      // Mock rate limiter to block requests
      mockGetGlobalRateLimiter.mockReturnValue({
        isAllowed: vi.fn().mockReturnValue(false),
        getRemainingRequests: vi.fn().mockReturnValue(0),
        getResetTime: vi.fn().mockReturnValue(Date.now() + 60000),
      });

      const request = createRequest(
        { profile: { name: 'Test', headline: 'Engineer' } },
        '192.168.1.1'
      );
      const response = await POST(request as never);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toContain('Rate limit');
    });

    it('includes rate limit headers in response', async () => {
      mockGetGlobalRateLimiter.mockReturnValue({
        isAllowed: vi.fn().mockReturnValue(true),
        getRemainingRequests: vi.fn().mockReturnValue(9),
        getResetTime: vi.fn().mockReturnValue(Date.now() + 60000),
      });

      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          skills: [],
          archetype: 'builder',
          couldBe: [],
          goodFor: [],
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const request = createRequest(
        { profile: { name: 'Test', headline: 'Engineer' } },
        '192.168.1.1'
      );
      const response = await POST(request as never);

      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
    });
  });
});
