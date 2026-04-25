/**
 * Echo service — server helpers for the Clarity Mode Echo (T-3 recall
 * question + next-open attempt).
 *
 * Storage: `lib/models/Echo.ts`. One Echo per `{userId, sessionDate}` (unique
 * index enforces this). `getPendingEcho` enforces the 48 h TTL at read time
 * so a stale cron is never a correctness problem.
 */

import mongoose from 'mongoose';
import Echo, { IEcho } from '@/lib/models/Echo';
import { CLARITY_MODE } from '@/lib/limits';

export type EchoOutcome = 'pending' | 'answered' | 'skipped';

export interface CreateEchoInput {
  userId: string | mongoose.Types.ObjectId;
  sessionDate: string;      // YYYY-MM-DD in the contract's timezone
  question: string;         // ≤ CLARITY_MODE.echo.maxQuestionChars
}

export interface SubmitAnswerInput {
  userId: string | mongoose.Types.ObjectId;
  echoId: string | mongoose.Types.ObjectId;
  attemptedAnswer: string;  // ≤ CLARITY_MODE.echo.maxAnswerChars
  selfConfidence: 1 | 2 | 3 | 4 | 5;
}

function toObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

function trimQuestion(q: string): string {
  return q.trim().replace(/\s+/g, ' ');
}

/**
 * Create a pending Echo for a user's session. Throws a `DuplicateEchoError`
 * if one already exists for `{userId, sessionDate}` (one Echo per session).
 */
export class DuplicateEchoError extends Error {
  constructor() {
    super('Echo already exists for this session');
    this.name = 'DuplicateEchoError';
  }
}

export async function createEcho(input: CreateEchoInput): Promise<IEcho> {
  const question = trimQuestion(input.question);
  if (!question) {
    throw new Error('Question is required');
  }
  if (question.length > CLARITY_MODE.echo.maxQuestionChars) {
    throw new Error(`Question is too long (max ${CLARITY_MODE.echo.maxQuestionChars} chars)`);
  }

  try {
    return (await Echo.create({
      userId: toObjectId(input.userId),
      sessionDate: input.sessionDate,
      question,
      outcome: 'pending',
      createdAt: new Date(),
    })) as IEcho;
  } catch (err) {
    // MongoDB duplicate-key on the unique {userId, sessionDate} index.
    if ((err as { code?: number }).code === 11000) {
      throw new DuplicateEchoError();
    }
    throw err;
  }
}

/**
 * Return the latest pending Echo for a user, within the TTL window, or null.
 * Anything older than `pendingTtlHours` is ignored (and should be swept by
 * the cron, but correctness does not depend on it).
 */
export async function getPendingEcho(
  userId: string | mongoose.Types.ObjectId,
  now: Date = new Date(),
): Promise<IEcho | null> {
  const cutoff = new Date(
    now.getTime() - CLARITY_MODE.echo.pendingTtlHours * 60 * 60 * 1000,
  );
  return (await Echo.findOne({
    userId: toObjectId(userId),
    outcome: 'pending',
    createdAt: { $gt: cutoff },
  })
    .sort({ createdAt: -1 })
    .lean<IEcho | null>()
    .exec());
}

export async function submitEchoAnswer(input: SubmitAnswerInput): Promise<IEcho | null> {
  if (![1, 2, 3, 4, 5].includes(input.selfConfidence)) {
    throw new Error('selfConfidence must be 1–5');
  }
  const answer = input.attemptedAnswer.trim();
  if (!answer) {
    throw new Error('attemptedAnswer is required');
  }
  if (answer.length > CLARITY_MODE.echo.maxAnswerChars) {
    throw new Error(`Answer is too long (max ${CLARITY_MODE.echo.maxAnswerChars} chars)`);
  }

  return (await Echo.findOneAndUpdate(
    {
      _id: toObjectId(input.echoId),
      userId: toObjectId(input.userId),
      outcome: 'pending',
    },
    {
      $set: {
        attemptedAnswer: answer,
        selfConfidence: input.selfConfidence,
        answeredAt: new Date(),
        outcome: 'answered',
      },
    },
    { new: true },
  ).lean<IEcho | null>());
}

export async function skipEcho(
  userId: string | mongoose.Types.ObjectId,
  echoId: string | mongoose.Types.ObjectId,
): Promise<IEcho | null> {
  return (await Echo.findOneAndUpdate(
    {
      _id: toObjectId(echoId),
      userId: toObjectId(userId),
      outcome: 'pending',
    },
    {
      $set: { outcome: 'skipped', answeredAt: new Date() },
    },
    { new: true },
  ).lean<IEcho | null>());
}

/**
 * Roll any pending Echoes older than `pendingTtlHours` to `skipped`.
 * Called by the `sweep-expired-echos` scheduled task. Returns the count
 * of updated rows. Safe to run concurrently — uses a single `updateMany`.
 */
export async function sweepExpiredEchos(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(
    now.getTime() - CLARITY_MODE.echo.pendingTtlHours * 60 * 60 * 1000,
  );
  const result = await Echo.updateMany(
    { outcome: 'pending', createdAt: { $lte: cutoff } },
    { $set: { outcome: 'skipped', answeredAt: now } },
  );
  return result.modifiedCount ?? 0;
}
