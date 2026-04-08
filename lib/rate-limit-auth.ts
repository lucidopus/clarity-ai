/**
 * In-memory rate limiter for authentication endpoints.
 * Tracks failed attempts per key (IP or IP+username) with sliding window.
 */

interface RateLimitEntry {
  attempts: number;
  resetAt: number; // timestamp ms
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check if a key is rate-limited.
 * @param key - Unique identifier (e.g., IP address, "ip:username")
 * @param maxAttempts - Max allowed attempts in the window
 * @param windowMs - Window duration in milliseconds
 * @returns { limited: boolean, remaining: number, retryAfterMs: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  _windowMs: number
): { limited: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // No entry or expired — not limited
    return { limited: false, remaining: maxAttempts, retryAfterMs: 0 };
  }

  if (entry.attempts >= maxAttempts) {
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return {
    limited: false,
    remaining: maxAttempts - entry.attempts,
    retryAfterMs: 0,
  };
}

/**
 * Record a failed attempt for a key.
 */
export function recordFailedAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { attempts: 1, resetAt: now + windowMs });
  } else {
    entry.attempts += 1;
  }
}

/**
 * Reset attempts for a key (e.g., on successful login).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Extract client IP from request headers.
 * Uses rightmost X-Forwarded-For entry (harder to spoof behind a proxy).
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const ips = xff.split(',').map(ip => ip.trim());
    // Use rightmost IP (closest to the server / set by trusted proxy)
    return ips[ips.length - 1] || 'unknown';
  }
  return headers.get('x-real-ip') || 'unknown';
}
