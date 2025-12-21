/**
 * Simple in-memory rate limiter for API protection
 *
 * NOTE: This is a basic implementation that works within a single serverless
 * instance. For production with Vercel, consider using @upstash/ratelimit
 * with Upstash Redis for distributed rate limiting across instances.
 */

export interface RateLimiterConfig {
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RequestRecord {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  /** Check if request is allowed and record it */
  isAllowed: (identifier: string) => boolean;
  /** Get remaining requests for an identifier */
  getRemainingRequests: (identifier: string) => number;
  /** Get reset time for an identifier (null if not tracked) */
  getResetTime: (identifier: string) => number | null;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
};

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(
  config: Partial<RateLimiterConfig> = {}
): RateLimiter {
  const { maxRequests, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const records = new Map<string, RequestRecord>();

  function getOrCreateRecord(identifier: string): RequestRecord {
    const now = Date.now();
    let record = records.get(identifier);

    // Create new record or reset if window expired
    if (!record || now >= record.resetAt) {
      record = {
        count: 0,
        resetAt: now + windowMs,
      };
      records.set(identifier, record);
    }

    return record;
  }

  function isAllowed(identifier: string): boolean {
    const record = getOrCreateRecord(identifier);

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  function getRemainingRequests(identifier: string): number {
    const record = records.get(identifier);

    if (!record || Date.now() >= record.resetAt) {
      return maxRequests;
    }

    return Math.max(0, maxRequests - record.count);
  }

  function getResetTime(identifier: string): number | null {
    const record = records.get(identifier);

    if (!record || Date.now() >= record.resetAt) {
      return null;
    }

    return record.resetAt;
  }

  return {
    isAllowed,
    getRemainingRequests,
    getResetTime,
  };
}

// Singleton instance for API routes
let globalLimiter: RateLimiter | null = null;

/**
 * Get the global rate limiter instance (creates one if needed)
 */
export function getGlobalRateLimiter(): RateLimiter {
  if (!globalLimiter) {
    globalLimiter = createRateLimiter({
      maxRequests: 10, // 10 requests per minute per IP
      windowMs: 60000,
    });
  }
  return globalLimiter;
}
