import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizAttempt {
  quizId: mongoose.Types.ObjectId;
  score: number;
  attemptNumber: number;
  userAnswerIndex?: number;
  completedAt: Date;
}

export interface IProgress extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId: string; // YouTube video ID
  masteredFlashcardIds: mongoose.Types.ObjectId[];
  masteredQuizIds: mongoose.Types.ObjectId[];
  quizAttempts: IQuizAttempt[];
  lastAccessedAt: Date;
  totalStudyTimeSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuizAttemptSchema: Schema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  attemptNumber: { type: Number, required: true },
  userAnswerIndex: { type: Number },
  completedAt: { type: Date, required: true },
}, { _id: false });

const ProgressSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: String, required: true }, // YouTube video ID (e.g., "dQw4w9WgXcQ")
  masteredFlashcardIds: [{ type: Schema.Types.ObjectId, ref: 'Flashcard' }],
  masteredQuizIds: [{ type: Schema.Types.ObjectId, ref: 'Quiz' }],
  quizAttempts: [QuizAttemptSchema],
  lastAccessedAt: { type: Date, default: Date.now },
  totalStudyTimeSeconds: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'progress', // Explicitly set collection name to prevent auto-pluralization
});

// Create indexes
ProgressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export default mongoose.models.Progress || mongoose.model<IProgress>('Progress', ProgressSchema);