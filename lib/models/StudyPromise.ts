import mongoose, { Document, Schema } from 'mongoose';

/**
 * The Promise — a single one-line commitment a user writes at Clarity Mode
 * window close, surfaced again at the next window open for a Kept / Broke /
 * Skipped self-report. One Promise per session (unique on
 * `{userId, sessionDate}`).
 *
 * The class is `StudyPromise` (not `Promise`) so it never shadows the JS
 * `Promise` global at any call site.
 *
 * Sweeper rolls pending Promises older than `pendingTtlHours` (see
 * lib/limits.ts) to `outcome: 'skipped'`. `getPendingStudyPromise` enforces
 * the TTL at read time, so sweeping is housekeeping — not correctness.
 */
export interface IStudyPromise extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** YYYY-MM-DD in the contract's timezone, matching the *opening* window. */
  sessionDate: string;
  /** When the promise was made (close-of-window moment). */
  createdAt: Date;
  /** The user's promise text, ≤ 120 chars. */
  text: string;
  reviewedAt?: Date;
  outcome: 'pending' | 'kept' | 'broke' | 'skipped';
}

const StudyPromiseSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionDate: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    text: { type: String, required: true, maxlength: 120 },
    reviewedAt: { type: Date, default: null },
    outcome: {
      type: String,
      enum: ['pending', 'kept', 'broke', 'skipped'],
      default: 'pending',
    },
  },
  { timestamps: false, collection: 'studypromises' },
);

StudyPromiseSchema.index({ userId: 1, sessionDate: -1 });
StudyPromiseSchema.index({ userId: 1, sessionDate: 1 }, { unique: true });

export default mongoose.models.StudyPromise
  || mongoose.model<IStudyPromise>('StudyPromise', StudyPromiseSchema);
