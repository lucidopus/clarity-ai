import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashcardReview extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  flashcardId: mongoose.Types.ObjectId;
  sourceId: string;
  rating: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
  reviewedAt: Date;
  scheduledFor: Date;
  responseTimeMs?: number;
  stateBefore: number; // card state before this review (0=New, 1=Learning, 2=Review, 3=Relearning)
}

const FlashcardReviewSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  flashcardId: { type: Schema.Types.ObjectId, ref: 'Flashcard', required: true },
  sourceId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 4 },
  reviewedAt: { type: Date, required: true },
  scheduledFor: { type: Date, required: true },
  responseTimeMs: { type: Number },
  stateBefore: { type: Number, required: true, default: 0 },
}, {
  timestamps: false,
  collection: 'flashcard_reviews',
});

FlashcardReviewSchema.index({ userId: 1, reviewedAt: -1 });
FlashcardReviewSchema.index({ flashcardId: 1, reviewedAt: -1 });

export default mongoose.models.FlashcardReview ||
  mongoose.model<IFlashcardReview>('FlashcardReview', FlashcardReviewSchema);
