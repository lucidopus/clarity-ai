import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashcard extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId: string; // YouTube video ID
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard'; // Optional: AI cards have difficulty, user cards don't
  generationType: 'ai' | 'human';
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: String, required: true }, // YouTube video ID (e.g., "dQw4w9WgXcQ")
  question: { type: String, required: true },
  answer: { type: String, required: true },
  difficulty: { type: String, required: false, enum: ['easy', 'medium', 'hard'] }, // Optional: Only AI cards have difficulty
  generationType: { type: String, required: true, enum: ['ai', 'human'] },
}, {
  timestamps: true,
  collection: 'flashcards', // Explicit collection name
});

// Create indexes
FlashcardSchema.index({ videoId: 1, userId: 1 });
FlashcardSchema.index({ userId: 1, generationType: 1 });

export default mongoose.models.Flashcard || mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);