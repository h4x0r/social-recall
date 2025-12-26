import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  RateLimiter,
  createRateLimiter,
  RATE_LIMIT_CONFIG,
  getClientIdentifier,
  withRateLimit,
} from './rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isAllowed', () => {
    it('allows requests under the limit', () => {
      expect(limiter.isAllowed('192.168.1.1')).toBe(true);
      expect(limiter.isAllowed('192.168.1.1')).toBe(true);
      expect(limiter.isAllowed('192.168.1.1')).toBe(true);
    });

    it('blocks requests over the limit', () => {
      limiter.isAllowed('192.168.1.1');
      limiter.isAllowed('192.168.1.1');
      limiter.isAllowed('192.168.1.1');

      expect(limiter.isAllowed('192.168.1.1')).toBe(false);
    });

    it('tracks different IPs separately', () => {
      // Use up IP 1's quota
      limiter.isAllowed('192.168.1.1');
      limiter.isAllowed('192.168.1.1');
      limiter.isAllowed('192.168.1.1');

      // IP 2 should still be allowed
      expect(limiter.isAllowed('192.168.1.2')).toBe(true);
    });

    it('resets after window expires', () => {
      // Use up quota
      limiter.isAllowed('192.168.1.1');
      limiter.isAllowed('192.168.1.1');
      limiter.isAllowed('192.168.1.1');
      expect(limiter.isAllowed('192.168.1.1')).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(60001);

      // Should be allowed again
      expect(limiter.isAllowed('192.168.1.1')).toBe(true);
    });
  });

  describe('getRemainingRequests', () => {
    it('returns max requests for new IP', () => {
      expect(limiter.getRemainingRequests('192.168.1.1')).toBe(3);
    });

    it('decrements after each request', () => {
      limiter.isAllowed('192.168.1.1');
      expect(limiter.getRemainingRequests('192.168.1.1')).toBe(2);

      limiter.isAllowed('192.168.1.1');
      expect(limiter.getRemainingRequests('192.168.1.1')).toBe(1);
    });

    it('returns 0 when limit reached', () => {
      limiter.isAllowed('192.168.1.1');
      limiter.isAllowed('192.168.1.1');
      limiter.isAllowed('192.168.1.1');

      expect(limiter.getRemainingRequests('192.168.1.1')).toBe(0);
    });
  });

  describe('getResetTime', () => {
    it('returns reset time for tracked IP', () => {
      limiter.isAllowed('192.168.1.1');

      const resetTime = limiter.getResetTime('192.168.1.1');
      expect(resetTime).toBeGreaterThan(Date.now());
    });

    it('returns null for untracked IP', () => {
      expect(limiter.getResetTime('192.168.1.1')).toBeNull();
    });
  });
});

describe('default rate limiter config', () => {
  it('uses sensible defaults', () => {
    const limiter = createRateLimiter();
    // Default: 10 requests per minute
    for (let i = 0; i < 10; i++) {
      expect(limiter.isAllowed('test-ip')).toBe(true);
    }
    expect(limiter.isAllowed('test-ip')).toBe(false);
  });
});

// ============================================================================
// Middleware Tests
// ============================================================================

describe('RATE_LIMIT_CONFIG', () => {
  it('defines limits for different route types', () => {
    expect(RATE_LIMIT_CONFIG.sync.maxRequests).toBeGreaterThan(0);
    expect(RATE_LIMIT_CONFIG.notes.maxRequests).toBeGreaterThan(0);
    expect(RATE_LIMIT_CONFIG.ai.maxRequests).toBeGreaterThan(0);
  });

  it('has stricter limits for AI routes', () => {
    expect(RATE_LIMIT_CONFIG.ai.maxRequests).toBeLessThanOrEqual(RATE_LIMIT_CONFIG.notes.maxRequests);
  });
});

describe('getClientIdentifier', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' },
    });
    expect(getClientIdentifier(request)).toBe('192.168.1.100');
  });

  it('extracts IP from x-real-ip header', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-real-ip': '192.168.1.200' },
    });
    expect(getClientIdentifier(request)).toBe('192.168.1.200');
  });

  it('returns unknown for missing headers', () => {
    const request = new NextRequest('http://localhost/api/test');
    expect(getClientIdentifier(request)).toBe('unknown');
  });
});

describe('withRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('OK'));
    const limitedHandler = withRateLimit(handler, 'notes');

    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });

    const response = await limitedHandler(request);
    expect(handler).toHaveBeenCalled();
    expect(response.status).not.toBe(429);
  });

  it('blocks requests over the limit with 429', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('OK'));
    const limitedHandler = withRateLimit(handler, 'ai');

    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.99' },
    });

    // Exhaust the limit
    for (let i = 0; i < RATE_LIMIT_CONFIG.ai.maxRequests; i++) {
      await limitedHandler(request);
    }

    // Next request should be blocked
    const response = await limitedHandler(request);
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.error).toContain('Too many requests');
  });

  it('includes rate limit headers in response', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('OK'));
    const limitedHandler = withRateLimit(handler, 'notes');

    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.50' },
    });

    const response = await limitedHandler(request);
    expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
  });
});
