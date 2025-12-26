import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set environment variables before imports
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

// Create mock chain builders
const createMockChain = (finalData: unknown = null, finalError: unknown = null) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
  return chain;
};

// Mock Supabase - need to track calls to configure behavior
let mockSupabaseChains: Record<string, ReturnType<typeof createMockChain>> = {};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (!mockSupabaseChains[table]) {
        mockSupabaseChains[table] = createMockChain();
      }
      return mockSupabaseChains[table];
    }),
  })),
}));

// Mock global fetch for infer-skills call
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { POST } from './route';

function createRequest(body: unknown, ip?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ip) {
    headers['x-forwarded-for'] = ip;
  }
  return new Request('http://localhost/api/profile-intelligence', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/profile-intelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseChains = {};

    // Default: mock infer-skills to return valid response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        archetype: 'builder',
        skills: [{ name: 'TypeScript', category: 'Engineering', confidence: 0.9 }],
        couldBe: ['Tech Advisor'],
        goodFor: ['Dev tools'],
      }),
    });
  });

  describe('input validation', () => {
    it('returns 400 when linkedin_id is missing', async () => {
      const request = createRequest({
        profile_data: { name: 'John Doe', headline: 'Engineer' },
      });
      const response = await POST(request as never);
      expect(response.status).toBe(400);
    });

    it('returns 400 when profile_data is missing', async () => {
      const request = createRequest({
        linkedin_id: 'johndoe',
      });
      const response = await POST(request as never);
      expect(response.status).toBe(400);
    });

    it('returns 400 when name is missing from profile_data', async () => {
      const request = createRequest({
        linkedin_id: 'johndoe',
        profile_data: { headline: 'Engineer' },
      });
      const response = await POST(request as never);
      expect(response.status).toBe(400);
    });

    it('returns 400 when headline is missing from profile_data', async () => {
      const request = createRequest({
        linkedin_id: 'johndoe',
        profile_data: { name: 'John Doe' },
      });
      const response = await POST(request as never);
      expect(response.status).toBe(400);
    });
  });

  describe('caching behavior', () => {
    it('returns cached analysis when available and not stale', async () => {
      // Set up mock to return existing profile with fresh analysis
      const now = new Date();
      const profileChain = createMockChain({
        id: 'existing-profile-id',
        last_updated_at: new Date(now.getTime() - 1000).toISOString(), // 1 second ago
        ai_analyzed_at: now.toISOString(), // Now (fresher than last_updated_at)
        verified: true,
      });
      mockSupabaseChains['master_profiles'] = profileChain;

      // Mock cached analysis
      const analysisChain = createMockChain({
        archetype: 'builder',
        skills: [{ name: 'TypeScript', category: 'Engineering', confidence: 0.9 }],
        could_be: ['Tech Advisor'],
        good_for: ['Dev tools'],
      });
      mockSupabaseChains['master_profile_ai_analysis'] = analysisChain;

      const request = createRequest({
        linkedin_id: 'cached-user',
        profile_data: { name: 'Cached User', headline: 'Engineer' },
      });
      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(true);
    });
  });

  describe('response structure', () => {
    it('returns analysis with required fields', async () => {
      // Set up mock for new profile (no existing)
      const profileChain = createMockChain(null);
      mockSupabaseChains['master_profiles'] = profileChain;

      // Mock insert to return new profile ID
      profileChain.single = vi.fn().mockResolvedValue({
        data: { id: 'new-profile-id' },
        error: null,
      });

      const request = createRequest({
        linkedin_id: 'test-user',
        profile_data: { name: 'Test User', headline: 'Software Engineer' },
      });
      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('archetype');
      expect(data).toHaveProperty('skills');
      expect(data).toHaveProperty('could_be');
      expect(data).toHaveProperty('good_for');
      expect(data).toHaveProperty('verified');
      expect(data).toHaveProperty('cached');
    });
  });
});
