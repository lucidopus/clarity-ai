/**
 * MongoDB-backed rate limiter.
 * Works correctly on serverless (no in-memory state).
 * Uses a `ratelimits` collection with TTL auto-expiry.
 */

import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import { RATE_LIMITS, UNLIMITED } from '@/lib/limits';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

interface ChatbotRateLimitResult extends RateLimitResult {
  resetTime: Date;
}

let indexEnsured = false;

/**
 * Check and increment a rate limit counter for a given key.
 * Returns allowed:true immediately when UNLIMITED_MODE is enabled.
 *
 * @param key       Unique identifier (e.g. `tts:${userId}`)
 * @param limit     Max requests allowed in the window
 * @param windowSec Window duration in seconds
 */
export async function checkRateLimitMongo(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (UNLIMITED) return { allowed: true, remaining: -1 };
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');

  const collection = db.collection('ratelimits');

  // Ensure TTL index once per cold start (not on every request)
  if (!indexEnsured) {
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    indexEnsured = true;
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSec * 1000);

  // Atomic upsert: reset if expired, otherwise increment
  const result = await collection.findOneAndUpdate(
    { _id: key as unknown as mongoose.Types.ObjectId },
    [
      {
        $set: {
          count: {
            $cond: {
              if: { $lt: ['$windowStart', windowStart] },
              then: 1,             // window expired → reset to 1
              else: { $add: ['$count', 1] }, // still in window → increment
            },
          },
          windowStart: {
            $cond: {
              if: { $lt: ['$windowStart', windowStart] },
              then: now,
              else: '$windowStart',
            },
          },
          expiresAt: new Date(now.getTime() + windowSec * 1000),
        },
      },
    ],
    { upsert: true, returnDocument: 'after' },
  );

  const doc = result as unknown as { count: number; windowStart: Date } | null;
  const count = doc?.count ?? 1;

  if (count > limit) {
    const windowEnd = new Date((doc?.windowStart ?? now).getTime() + windowSec * 1000);
    const retryAfter = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000));
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: limit - count };
}

/**
 * Chatbot-specific rate limit: enforces both daily and burst windows.
 * Uses two atomic counters in the ratelimits collection.
 */
export async function checkChatbotRateLimit(
  userId: string,
): Promise<ChatbotRateLimitResult> {
  if (UNLIMITED) {
    return { allowed: true, remaining: -1, resetTime: new Date(Date.now() + 86_400_000) };
  }

  const [daily, burst] = await Promise.all([
    checkRateLimitMongo(`chat-daily:${userId}`, RATE_LIMITS.chatbot.daily.max, RATE_LIMITS.chatbot.daily.windowSec),
    checkRateLimitMongo(`chat-burst:${userId}`, RATE_LIMITS.chatbot.burst.max, RATE_LIMITS.chatbot.burst.windowSec),
  ]);

  const allowed = daily.allowed && burst.allowed;
  const remaining = Math.min(daily.remaining, burst.remaining);

  let retryAfter: number | undefined;
  if (!allowed) {
    retryAfter = !burst.allowed ? burst.retryAfter : daily.retryAfter;
  }

  return {
    allowed,
    remaining,
    resetTime: new Date(Date.now() + RATE_LIMITS.chatbot.daily.windowSec * 1000),
    retryAfter,
  };
}
