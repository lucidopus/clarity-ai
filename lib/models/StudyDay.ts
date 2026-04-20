import mongoose, { Document, Schema } from 'mongoose';

/**
 * Tracks per-day study activity counts for Study Streaks 2.0.
 * One document per user per UTC calendar day.
 */
export interface IStudyDay extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;          // YYYY-MM-DD (UTC)
  flashcardReviews: number;
  quizzesCompleted: number;
  sourcesProcessed: number;
  flashcardsCreated: number;
  documentStudySessions: number;
  qualifies: boolean;    // true when thresholds are met and streak is already updated
  shieldUsed: boolean;   // true when a shield was consumed for this day (missed but recovered)
  // Day-quality tiers (sticky once set, never reverted within the same day).
  // Render rules: empty day → nothing; qualifies → gray; + fsrsQueueCleared → orange;
  // + challengesCompleted && inContractWindow → gold.
  fsrsQueueCleared: boolean;
  challengesCompleted: boolean;
  inContractWindow: boolean;
  // Clarity Mode — Pause Budget accounting. Server-anchored so a mid-pause
  // refresh rehydrates from `pauseStartedAt` instead of resetting to zero.
  pauseMinutesBudgeted: number;   // captured at first pause, immutable for the day
  pauseSecondsUsed: number;       // cumulative seconds actually spent paused
  pauseCount: number;             // total pause invocations
  pauseStartedAt: Date | null;    // non-null while a pause is in flight
}

const StudyDaySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    flashcardReviews: { type: Number, default: 0 },
    quizzesCompleted: { type: Number, default: 0 },
    sourcesProcessed: { type: Number, default: 0 },
    flashcardsCreated: { type: Number, default: 0 },
    documentStudySessions: { type: Number, default: 0 },
    qualifies: { type: Boolean, default: false },
    shieldUsed: { type: Boolean, default: false },
    fsrsQueueCleared: { type: Boolean, default: false },
    challengesCompleted: { type: Boolean, default: false },
    inContractWindow: { type: Boolean, default: false },
    // Clarity Mode pause accounting (see IStudyDay)
    pauseMinutesBudgeted: { type: Number, default: 0 },
    pauseSecondsUsed: { type: Number, default: 0 },
    pauseCount: { type: Number, default: 0 },
    pauseStartedAt: { type: Date, default: null },
  },
  { timestamps: false, collection: 'study_days' }
);

StudyDaySchema.index({ userId: 1, date: 1 }, { unique: true });
StudyDaySchema.index({ userId: 1, date: -1 });

export default mongoose.models.StudyDay || mongoose.model<IStudyDay>('StudyDay', StudyDaySchema);
