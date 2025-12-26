/**
 * Rate Limiting for API Protection
 *
 * NOTE: This is a basic in-memory implementation that works within a single
 * serverless instance. For production with Vercel, consider using @upstash/ratelimit
 * with Upstash Redis for distributed rate limiting across instances.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Core Rate Limiter
// ============================================================================

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

// ============================================================================
// Route-Specific Rate Limits
// ============================================================================

/** Rate limit configurations for different route types */
export const RATE_LIMIT_CONFIG = {
  // Contact sync - moderate limit (bulk operations)
  sync: {
    maxRequests: 30,
    windowMs: 60000, // 30 per minute
  },
  // Notes CRUD - higher limit (frequent operations)
  notes: {
    maxRequests: 60,
    windowMs: 60000, // 60 per minute
  },
  // AI inference - stricter limit (expensive operations)
  ai: {
    maxRequests: 10,
    windowMs: 60000, // 10 per minute
  },
  // General API - default
  default: {
    maxRequests: 30,
    windowMs: 60000, // 30 per minute
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

// Cache of rate limiters by type
const limiters = new Map<RateLimitType, RateLimiter>();

function getLimiter(type: RateLimitType): RateLimiter {
  let limiter = limiters.get(type);
  if (!limiter) {
    const config = RATE_LIMIT_CONFIG[type];
    limiter = createRateLimiter(config);
    limiters.set(type, limiter);
  }
  return limiter;
}

// ============================================================================
// Next.js Request Helpers
// ============================================================================

/**
 * Extract client identifier from request
 * Uses x-forwarded-for or x-real-ip headers (from proxies like Vercel)
 */
export function getClientIdentifier(request: NextRequest): string {
  // Vercel and other proxies set these headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list; take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

type RequestHandler = (request: NextRequest) => Promise<Response>;

/**
 * Wrap a request handler with rate limiting
 */
export function withRateLimit(
  handler: RequestHandler,
  type: RateLimitType = 'default'
): RequestHandler {
  const limiter = getLimiter(type);
  const config = RATE_LIMIT_CONFIG[type];

  return async (request: NextRequest): Promise<Response> => {
    const clientId = getClientIdentifier(request);

    // Check rate limit
    if (!limiter.isAllowed(clientId)) {
      const resetTime = limiter.getResetTime(clientId);
      const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;

      return NextResponse.json(
        {
          error: 'Too many requests. Please slow down.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetTime || Date.now() + config.windowMs),
          },
        }
      );
    }

    // Execute the handler
    const response = await handler(request);

    // Add rate limit headers to successful responses
    const remaining = limiter.getRemainingRequests(clientId);
    const resetTime = limiter.getResetTime(clientId);

    // Clone response and add headers
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(config.maxRequests));
    headers.set('X-RateLimit-Remaining', String(remaining));
    if (resetTime) {
      headers.set('X-RateLimit-Reset', String(resetTime));
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Check if request is rate limited (for use in route handlers)
 * Returns error response if limited, null if allowed
 */
export function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'default'
): NextResponse | null {
  const limiter = getLimiter(type);
  const config = RATE_LIMIT_CONFIG[type];
  const clientId = getClientIdentifier(request);

  if (!limiter.isAllowed(clientId)) {
    const resetTime = limiter.getResetTime(clientId);
    const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;

    return NextResponse.json(
      {
        error: 'Too many requests. Please slow down.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null;
}

/**
 * Get rate limit info for a client (useful for headers)
 */
export function getRateLimitInfo(
  request: NextRequest,
  type: RateLimitType = 'default'
): { limit: number; remaining: number; reset: number | null } {
  const limiter = getLimiter(type);
  const config = RATE_LIMIT_CONFIG[type];
  const clientId = getClientIdentifier(request);

  return {
    limit: config.maxRequests,
    remaining: limiter.getRemainingRequests(clientId),
    reset: limiter.getResetTime(clientId),
  };
}

// Legacy export for backward compatibility
export function getGlobalRateLimiter(): RateLimiter {
  return getLimiter('default');
}
