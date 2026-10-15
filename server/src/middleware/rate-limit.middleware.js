import { AppError } from '../utils/app-error.js';

/**
 * In-memory sliding window rate limiter
 * Designed for single-instance Node.js backend deployments.
 * NOTE: Counters are stored in-memory per process and are not shared across distributed clusters.
 */
export class MemoryRateLimiterStore {
  constructor(cleanupIntervalMs = 60000) {
    this.hits = new Map();
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
    // Unref timer so it doesn't prevent process termination in tests
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  get(key) {
    return this.hits.get(key);
  }

  increment(key, windowMs) {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      const newEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      this.hits.set(key, newEntry);
      return newEntry;
    }

    entry.count += 1;
    return entry;
  }

  reset(key) {
    if (key) {
      this.hits.delete(key);
    } else {
      this.hits.clear();
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.hits.entries()) {
      if (entry.resetAt <= now) {
        this.hits.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupTimer);
    this.hits.clear();
  }
}

/**
 * Safely extracts client IP address without trusting spoofed headers
 * @param {import('express').Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  // If behind a trusted reverse proxy, X-Forwarded-For may be used, taking the leftmost IP
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    const ips = forwarded.split(',').map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Factory creating Express rate-limiting middleware
 *
 * @param {object} options
 * @param {number} [options.windowMs=60000] - Window duration in milliseconds
 * @param {number} [options.max=60] - Max allowed requests within windowMs
 * @param {string} [options.message='Too many requests. Please try again later.']
 * @param {string} [options.prefix='rl'] - Key prefix to isolate endpoints
 * @param {(req: import('express').Request) => string} [options.keyGenerator]
 * @returns {import('express').RequestHandler & { store: MemoryRateLimiterStore, reset: () => void }}
 */
export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests. Please try again later.',
  prefix = 'rl',
  keyGenerator,
} = {}) {
  const store = new MemoryRateLimiterStore();

  const middleware = (req, res, next) => {
    // Determine key: user ID if authenticated, otherwise client IP
    const clientKey = keyGenerator
      ? keyGenerator(req)
      : req.user?.id ? `u:${req.user.id}` : `ip:${getClientIp(req)}`;

    const fullKey = `${prefix}:${clientKey}`;
    const entry = store.increment(fullKey, windowMs);
    const now = Date.now();
    const remainingMs = Math.max(0, entry.resetAt - now);
    const retryAfterSec = Math.ceil(remainingMs / 1000);

    // Standard rate limit headers
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      res.setHeader('Retry-After', retryAfterSec);

      return next(
        new AppError(message, 429, 'RATE_LIMIT_EXCEEDED', {
          retryAfterSeconds: retryAfterSec,
          limit: max,
          windowSeconds: Math.ceil(windowMs / 1000),
        })
      );
    }

    next();
  };

  middleware.store = store;
  middleware.reset = () => store.reset();

  return middleware;
}

// Preconfigured rate limiters for sensitive endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes per IP
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  prefix: 'auth',
});

export const reauthRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: 'Too many reauthentication requests. Please try again later.',
  prefix: 'reauth',
});

export const oauthStartRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 OAuth starts per 10 minutes
  message: 'Too many GitHub authorization attempts. Please wait a moment before trying again.',
  prefix: 'oauth',
});

export const aiPlanRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 contribution plans per minute per user
  message: 'Rate limit exceeded for AI contribution planning. Please wait 1 minute before generating another plan.',
  prefix: 'ai-plan',
});

export const recommendationsRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 recommendation fetches per minute
  message: 'Rate limit exceeded for recommendations. Please wait a moment before refreshing.',
  prefix: 'recs',
});
