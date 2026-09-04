/**
 * Client-Side Defensive Rate Limiting & Anti-Spam Guard
 * Prevents rapid event creation spam, double-submissions, and bot request flooding.
 */

interface RateLimitConfig {
  maxRequests: number; // Max actions allowed within window
  windowMs: number;    // Sliding window duration in milliseconds
  cooldownMs?: number; // Minimum gap between consecutive actions
}

// Predefined rate limiting profiles for common app actions
export const RATE_LIMIT_PROFILES: Record<string, RateLimitConfig> = {
  // Event creation: max 1 per 15 seconds, max 5 per 10 minutes
  CREATE_EVENT: {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
    cooldownMs: 15 * 1000,
  },
  // Event reporting / feedback: max 3 per 5 minutes
  REPORT_EVENT: {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000,
    cooldownMs: 5 * 1000,
  },
  // RSVP / Interest toggle: max 15 per minute to prevent DB write abuse
  RSVP_TOGGLE: {
    maxRequests: 15,
    windowMs: 60 * 1000,
    cooldownMs: 400,
  },
};

interface ActionRecord {
  timestamps: number[];
  lastActionTime: number;
}

// In-memory sliding window state
const actionHistory = new Map<string, ActionRecord>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  reason?: 'cooldown' | 'window_limit';
}

/**
 * Checks if a specific action key is permitted under its rate limit policy.
 * @param actionKey Unique action identifier (e.g. 'CREATE_EVENT' or 'CREATE_EVENT_userId')
 * @param customConfig Optional override config
 */
export function checkRateLimit(
  actionKey: string,
  customConfig?: RateLimitConfig
): RateLimitResult {
  const config = customConfig || RATE_LIMIT_PROFILES[actionKey] || {
    maxRequests: 10,
    windowMs: 60 * 1000,
    cooldownMs: 1000,
  };

  const now = Date.now();
  let record = actionHistory.get(actionKey);

  if (!record) {
    record = { timestamps: [], lastActionTime: 0 };
    actionHistory.set(actionKey, record);
  }

  // 1. Check strict cooldown between consecutive actions
  if (config.cooldownMs && record.lastActionTime > 0) {
    const elapsedSinceLast = now - record.lastActionTime;
    if (elapsedSinceLast < config.cooldownMs) {
      const waitMs = config.cooldownMs - elapsedSinceLast;
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(waitMs / 1000),
        reason: 'cooldown',
      };
    }
  }

  // 2. Filter out timestamps outside the sliding window
  const windowStart = now - config.windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  // 3. Check window capacity
  if (record.timestamps.length >= config.maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const waitMs = oldestTimestamp + config.windowMs - now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
      reason: 'window_limit',
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

/**
 * Records an action occurrence after successful rate-limit check.
 */
export function recordAction(actionKey: string): void {
  const now = Date.now();
  let record = actionHistory.get(actionKey);
  if (!record) {
    record = { timestamps: [], lastActionTime: 0 };
    actionHistory.set(actionKey, record);
  }
  record.timestamps.push(now);
  record.lastActionTime = now;
}

/**
 * Convenience wrapper: checks limit, records action if allowed, or throws informative message.
 */
export function enforceRateLimit(
  actionKey: string,
  customConfig?: RateLimitConfig
): { allowed: boolean; retryAfterSeconds: number } {
  const result = checkRateLimit(actionKey, customConfig);
  if (result.allowed) {
    recordAction(actionKey);
  }
  return result;
}
