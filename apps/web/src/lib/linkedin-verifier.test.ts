import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyLinkedInProfile, LinkedInVerificationResult } from './linkedin-verifier';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Set environment variable
vi.stubEnv('RAPIDAPI_KEY', 'test-api-key');

describe('verifyLinkedInProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns verified=true when RapidAPI data matches contributed data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        firstName: 'John',
        lastName: 'Doe',
        headline: 'Senior Engineer at Stripe',
      }),
    });

    const result = await verifyLinkedInProfile('johndoe', {
      name: 'John Doe',
      headline: 'Senior Engineer at Stripe',
    });

    expect(result.verified).toBe(true);
    expect(result.match).toBe(true);
  });

  it('returns verified=false with mismatch when data differs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        firstName: 'John',
        lastName: 'Doe',
        headline: 'CEO at Startup',
      }),
    });

    const result = await verifyLinkedInProfile('johndoe', {
      name: 'John Doe',
      headline: 'Senior Engineer at Stripe', // Different headline
    });

    expect(result.verified).toBe(false);
    expect(result.mismatchFields).toContain('headline');
  });

  it('returns verified=false with notFound when profile not found on LinkedIn', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    });

    const result = await verifyLinkedInProfile('nonexistent', {
      name: 'Ghost User',
      headline: 'Nobody',
    });

    expect(result.verified).toBe(false);
    expect(result.notFound).toBe(true);
  });

  it('returns error when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await verifyLinkedInProfile('johndoe', {
      name: 'John Doe',
      headline: 'Engineer',
    });

    expect(result.verified).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles API rate limiting gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const result = await verifyLinkedInProfile('johndoe', {
      name: 'John Doe',
      headline: 'Engineer',
    });

    expect(result.verified).toBe(false);
    expect(result.rateLimited).toBe(true);
  });

  it('uses correct RapidAPI headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        firstName: 'Test',
        lastName: 'User',
        headline: 'Tester',
      }),
    });

    await verifyLinkedInProfile('testuser', {
      name: 'Test User',
      headline: 'Tester',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('linkedin-data-api'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-RapidAPI-Key': 'test-api-key',
          'X-RapidAPI-Host': 'linkedin-data-api.p.rapidapi.com',
        }),
      })
    );
  });
});
