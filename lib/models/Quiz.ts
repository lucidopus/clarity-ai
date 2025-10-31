import mongoose, { Document, Schema } from 'mongoose';

export interface IQuiz extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  generationType: 'ai';
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true },
  explanation: { type: String },
  difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
  generationType: { type: String, required: true, enum: ['ai'] },
}, {
  timestamps: true,
  collection: 'quizzes', // Explicit collection name
});

// Create indexes
QuizSchema.index({ videoId: 1, userId: 1 });

export default mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);