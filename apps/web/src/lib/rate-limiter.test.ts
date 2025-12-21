import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, createRateLimiter } from './rate-limiter';

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
