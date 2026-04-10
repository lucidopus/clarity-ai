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
  qualifies: boolean;    // true when thresholds are met and streak is already updated
  shieldUsed: boolean;   // true when a shield was consumed for this day (missed but recovered)
}

const StudyDaySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    flashcardReviews: { type: Number, default: 0 },
    quizzesCompleted: { type: Number, default: 0 },
    sourcesProcessed: { type: Number, default: 0 },
    flashcardsCreated: { type: Number, default: 0 },
    qualifies: { type: Boolean, default: false },
    shieldUsed: { type: Boolean, default: false },
  },
  { timestamps: false, collection: 'study_days' }
);

StudyDaySchema.index({ userId: 1, date: 1 }, { unique: true });
StudyDaySchema.index({ userId: 1, date: -1 });

export default mongoose.models.StudyDay || mongoose.model<IStudyDay>('StudyDay', StudyDaySchema);
