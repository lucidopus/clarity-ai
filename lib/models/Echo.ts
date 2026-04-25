import mongoose, { Document, Schema } from 'mongoose';

/**
 * The Echo — a single recall question a user writes at T-3 of their Clarity
 * Mode window, surfaced again at the next window open for a shot + self-
 * confidence rating. One Echo per session (unique on `{userId, sessionDate}`).
 *
 * Sweeper rolls pending Echoes older than `pendingTtlHours` (see lib/limits.ts)
 * to `outcome: 'skipped'`. `getPendingEcho` also enforces the TTL at read time,
 * so sweeping is housekeeping — not correctness.
 */
export interface IEcho extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** YYYY-MM-DD in the contract's timezone, matching the *opening* window. */
  sessionDate: string;
  /** When the question was written (T-3 moment). */
  createdAt: Date;
  /** The user's question, ≤ 200 chars. */
  question: string;
  answeredAt?: Date;
  /** User's attempt at answering, ≤ 1000 chars. */
  attemptedAnswer?: string;
  /** Self-reported confidence 1–5 at submit time. */
  selfConfidence?: 1 | 2 | 3 | 4 | 5;
  outcome: 'pending' | 'answered' | 'skipped';
}

const EchoSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionDate: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    question: { type: String, required: true, maxlength: 200 },
    answeredAt: { type: Date, default: null },
    attemptedAnswer: { type: String, maxlength: 1000 },
    selfConfidence: { type: Number, min: 1, max: 5 },
    outcome: {
      type: String,
      enum: ['pending', 'answered', 'skipped'],
      default: 'pending',
    },
  },
  { timestamps: false, collection: 'echos' },
);

EchoSchema.index({ userId: 1, sessionDate: -1 });
EchoSchema.index({ userId: 1, sessionDate: 1 }, { unique: true });

export default mongoose.models.Echo || mongoose.model<IEcho>('Echo', EchoSchema);
