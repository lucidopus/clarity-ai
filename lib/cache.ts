import { getRedis } from '@/lib/redis';

// ── Key factory ────────────────────────────────────────────────────────────────

export const CacheKeys = {
  insights:  (userId: string)                   => `insights:${userId}`,
  readiness: (userId: string, sourceId: string) => `readiness:${userId}:${sourceId}`,
  readinessAggregate: (userId: string)          => `readiness-agg:${userId}`,
  dashStats: (userId: string)                   => `dash:stats:${userId}`,
  claraGreeting: (userId: string)               => `clara-greeting:${userId}`,
};

// ── Core helper ────────────────────────────────────────────────────────────────

/**
 * Get a value from Redis cache, or compute it via `fallback` and store the result.
 *
 * Redis is NEVER a hard dependency — any Redis error (connection down, timeout,
 * misconfigured URL) falls back transparently to the `fallback` function.
 * The request is slower but never fails because of Redis.
 */
export async function getCached<T>(
  key: string,
  fallback: () => Promise<T>,
  ttlSec: number
): Promise<T> {
  try {
    const redis = getRedis();
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;

    const result = await fallback();
    // Best-effort write — don't let a failed write break the response
    await redis.setex(key, ttlSec, JSON.stringify(result));
    return result;
  } catch {
    // Redis unavailable or error — compute fresh without caching
    return fallback();
  }
}

// ── Invalidation helpers ───────────────────────────────────────────────────────

/** Bust insights cache for a user (call after new source completes processing). */
export async function invalidateUserInsights(userId: string): Promise<void> {
  try { await getRedis().del(CacheKeys.insights(userId)); } catch { /* silent */ }
}

/** Bust readiness score cache for a specific source (call after quiz/flashcard review). */
export async function invalidateReadiness(userId: string, sourceId: string): Promise<void> {
  try {
    await getRedis().del(
      CacheKeys.readiness(userId, sourceId),
      CacheKeys.readinessAggregate(userId)
    );
  } catch { /* silent */ }
}

/** Bust dashboard stats cache (call after any activity that changes stats). */
export async function invalidateDashStats(userId: string): Promise<void> {
  try { await getRedis().del(CacheKeys.dashStats(userId)); } catch { /* silent */ }
}

/** Bust all user-level caches at once (call after processing a new source). */
export async function invalidateAllUserCaches(userId: string, sourceId?: string): Promise<void> {
  try {
    const keys = [
      CacheKeys.insights(userId),
      CacheKeys.readinessAggregate(userId),
      CacheKeys.dashStats(userId),
    ];
    if (sourceId) keys.push(CacheKeys.readiness(userId, sourceId));
    await getRedis().del(...keys);
  } catch { /* silent */ }
}
