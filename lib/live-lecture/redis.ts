import redis from '@/lib/redis';

const HEARTBEAT_TTL = 30; // seconds
const QA_RATE_LIMIT_WINDOW = 60; // seconds
const QA_RATE_LIMIT_MAX = 10; // max questions per window

// ─── Session Heartbeat ──────────────────────────────────────────────────────

export async function setSessionHeartbeat(sessionId: string): Promise<void> {
  await redis.set(`live:session:${sessionId}`, '1', 'EX', HEARTBEAT_TTL);
}

export async function checkSessionAlive(sessionId: string): Promise<boolean> {
  const result = await redis.get(`live:session:${sessionId}`);
  return result !== null;
}

export async function clearSessionHeartbeat(sessionId: string): Promise<void> {
  await redis.del(`live:session:${sessionId}`);
}

// ─── Q&A Rate Limiting ──────────────────────────────────────────────────────

export async function checkQARateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `live:qa:rate:${userId}`;
  const count = await redis.incr(key);

  // Set TTL on first increment
  if (count === 1) {
    await redis.expire(key, QA_RATE_LIMIT_WINDOW);
  }

  const allowed = count <= QA_RATE_LIMIT_MAX;
  const remaining = Math.max(0, QA_RATE_LIMIT_MAX - count);

  return { allowed, remaining };
}
