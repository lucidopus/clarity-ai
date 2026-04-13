import mongoose, { Document, Schema } from 'mongoose';

export interface IFSRSCard {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review?: Date;
}

export interface IFlashcard extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceId: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  generationType: 'ai' | 'human';
  fsrs?: IFSRSCard;
  createdAt: Date;
  updatedAt: Date;
}

const FSRSCardSchema = new Schema<IFSRSCard>({
  due: { type: Date, required: true },
  stability: { type: Number, default: 0 },
  difficulty: { type: Number, default: 0 },
  elapsed_days: { type: Number, default: 0 },
  scheduled_days: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  lapses: { type: Number, default: 0 },
  learning_steps: { type: Number, default: 0 },
  state: { type: Number, default: 0 },
  last_review: { type: Date },
}, { _id: false });

const FlashcardSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  difficulty: { type: String, required: false, enum: ['easy', 'medium', 'hard'], default: null },
  generationType: { type: String, required: true, enum: ['ai', 'human'] },
  fsrs: { type: FSRSCardSchema },
}, {
  timestamps: true,
  collection: 'flashcards',
});

// Indexes
FlashcardSchema.index({ sourceId: 1, userId: 1 });
FlashcardSchema.index({ userId: 1, generationType: 1 });
FlashcardSchema.index({ userId: 1, 'fsrs.due': 1 });
FlashcardSchema.index({ userId: 1, sourceId: 1, createdAt: -1 }); // Dashboard activity + sorted queries

export default mongoose.models.Flashcard || mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);
