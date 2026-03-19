import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashcard extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceId: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  generationType: 'ai' | 'human';
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  difficulty: { type: String, required: false, enum: ['easy', 'medium', 'hard'], default: null },
  generationType: { type: String, required: true, enum: ['ai', 'human'] },
}, {
  timestamps: true,
  collection: 'flashcards',
});

// Indexes
FlashcardSchema.index({ sourceId: 1, userId: 1 });
FlashcardSchema.index({ userId: 1, generationType: 1 });

export default mongoose.models.Flashcard || mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);
