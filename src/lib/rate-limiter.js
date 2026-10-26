/**
 * In-memory sliding window rate limiter for brute-force prevention.
 * Protects login and sensitive authentication routes against credential stuffing.
 */

const attemptsMap = new Map();

// Periodic cleanup of expired entries (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptsMap.entries()) {
      if (now > record.resetTime) {
        attemptsMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Checks if an attempt is allowed under rate limiting rules.
 * @param {string} key - Identifier (e.g. email or client IP)
 * @param {number} maxAttempts - Allowed attempts within window (default: 5)
 * @param {number} windowMs - Window duration in milliseconds (default: 15 minutes)
 * @returns {{ allowed: boolean, remaining: number, retryAfterSec: number }}
 */
export function checkRateLimit(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = attemptsMap.get(key);

  if (!record || now > record.resetTime) {
    return {
      allowed: true,
      remaining: maxAttempts,
      retryAfterSec: 0
    };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec
    };
  }

  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    retryAfterSec: 0
  };
}

/**
 * Records a failed attempt for the given key.
 */
export function recordFailedAttempt(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = attemptsMap.get(key);

  if (!record || now > record.resetTime) {
    attemptsMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
  } else {
    record.count += 1;
  }
}

/**
 * Clears failed attempts upon a successful login.
 */
export function clearRateLimit(key) {
  attemptsMap.delete(key);
}
