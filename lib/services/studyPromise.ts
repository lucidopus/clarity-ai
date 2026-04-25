/**
 * StudyPromise service — server helpers for the Clarity Mode Promise (close
 * one-line commitment + next-open Kept/Broke/Skipped self-report).
 *
 * Storage: `lib/models/StudyPromise.ts`. One Promise per `{userId,
 * sessionDate}` (unique index enforces this). `getPendingStudyPromise`
 * enforces the 48 h TTL at read time so a stale cron is never a correctness
 * problem.
 */

import mongoose from 'mongoose';
import StudyPromise, { IStudyPromise } from '@/lib/models/StudyPromise';
import { CLARITY_MODE } from '@/lib/limits';

export type PromiseOutcome = 'pending' | 'kept' | 'broke' | 'skipped';
export type ReviewableOutcome = Exclude<PromiseOutcome, 'pending'>;

export interface CreateStudyPromiseInput {
  userId: string | mongoose.Types.ObjectId;
  sessionDate: string;      // YYYY-MM-DD in the contract's timezone
  text: string;             // ≤ CLARITY_MODE.promise.maxTextChars
}

export interface ReviewStudyPromiseInput {
  userId: string | mongoose.Types.ObjectId;
  promiseId: string | mongoose.Types.ObjectId;
  outcome: ReviewableOutcome;
}

export interface WeeklyPromiseSummary {
  kept: number;
  total: number;          // reviewed promises in window (kept + broke + skipped)
  windowStart: Date;      // inclusive
  windowEnd: Date;        // exclusive — equals `now`
}

function toObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

function trimText(t: string): string {
  return t.trim().replace(/\s+/g, ' ');
}

export class DuplicateStudyPromiseError extends Error {
  constructor() {
    super('Promise already exists for this session');
    this.name = 'DuplicateStudyPromiseError';
  }
}

/**
 * Create a pending Promise for a user's session. Throws
 * `DuplicateStudyPromiseError` if one already exists for `{userId,
 * sessionDate}` (one Promise per session).
 */
export async function createStudyPromise(input: CreateStudyPromiseInput): Promise<IStudyPromise> {
  const text = trimText(input.text);
  if (!text) {
    throw new Error('Promise text is required');
  }
  if (text.length > CLARITY_MODE.promise.maxTextChars) {
    throw new Error(`Promise is too long (max ${CLARITY_MODE.promise.maxTextChars} chars)`);
  }

  try {
    return (await StudyPromise.create({
      userId: toObjectId(input.userId),
      sessionDate: input.sessionDate,
      text,
      outcome: 'pending',
      createdAt: new Date(),
    })) as IStudyPromise;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new DuplicateStudyPromiseError();
    }
    throw err;
  }
}

/**
 * Return the latest pending Promise for a user, within the TTL window, or
 * null. Anything older than `pendingTtlHours` is filtered out at read time;
 * the sweep cron is housekeeping.
 */
export async function getPendingStudyPromise(
  userId: string | mongoose.Types.ObjectId,
  now: Date = new Date(),
): Promise<IStudyPromise | null> {
  const cutoff = new Date(
    now.getTime() - CLARITY_MODE.promise.pendingTtlHours * 60 * 60 * 1000,
  );
  return (await StudyPromise.findOne({
    userId: toObjectId(userId),
    outcome: 'pending',
    createdAt: { $gt: cutoff },
  })
    .sort({ createdAt: -1 })
    .lean<IStudyPromise | null>()
    .exec());
}

/**
 * Flip a pending Promise to `kept` / `broke` / `skipped` and stamp
 * `reviewedAt`. Returns the updated row, or null if no matching pending
 * Promise was found.
 */
export async function reviewStudyPromise(input: ReviewStudyPromiseInput): Promise<IStudyPromise | null> {
  if (!['kept', 'broke', 'skipped'].includes(input.outcome)) {
    throw new Error('outcome must be kept | broke | skipped');
  }
  return (await StudyPromise.findOneAndUpdate(
    {
      _id: toObjectId(input.promiseId),
      userId: toObjectId(input.userId),
      outcome: 'pending',
    },
    {
      $set: { outcome: input.outcome, reviewedAt: new Date() },
    },
    { new: true },
  ).lean<IStudyPromise | null>());
}

/**
 * Roll any pending Promises older than `pendingTtlHours` to `skipped`.
 * Called by the `sweep-expired-promises` scheduled task. Returns the count
 * of updated rows.
 */
export async function sweepExpiredStudyPromises(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(
    now.getTime() - CLARITY_MODE.promise.pendingTtlHours * 60 * 60 * 1000,
  );
  const result = await StudyPromise.updateMany(
    { outcome: 'pending', createdAt: { $lte: cutoff } },
    { $set: { outcome: 'skipped', reviewedAt: now } },
  );
  return result.modifiedCount ?? 0;
}

/**
 * Counts reviewed Promises (kept / broke / skipped) over the last N days
 * (default `weeklySummaryDays`). Pending Promises are excluded — the user
 * hasn't reported on them yet, so they shouldn't dilute the ratio.
 */
export async function getWeeklyPromiseSummary(
  userId: string | mongoose.Types.ObjectId,
  now: Date = new Date(),
): Promise<WeeklyPromiseSummary> {
  const windowMs = CLARITY_MODE.promise.weeklySummaryDays * 24 * 60 * 60 * 1000;
  const windowStart = new Date(now.getTime() - windowMs);

  const rows = await StudyPromise.find({
    userId: toObjectId(userId),
    outcome: { $in: ['kept', 'broke', 'skipped'] },
    reviewedAt: { $gte: windowStart, $lt: now },
  })
    .select('outcome')
    .lean<{ outcome: PromiseOutcome }[]>()
    .exec();

  const total = rows.length;
  const kept = rows.filter((r) => r.outcome === 'kept').length;
  return { kept, total, windowStart, windowEnd: now };
}
