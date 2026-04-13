import mongoose, { Document, Schema } from 'mongoose';

export interface IQuiz extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceId: string;
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
  sourceId: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true },
  explanation: { type: String },
  difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
  generationType: { type: String, required: true, enum: ['ai'] },
}, {
  timestamps: true,
  collection: 'quizzes',
});

// Indexes
QuizSchema.index({ sourceId: 1, userId: 1 });
QuizSchema.index({ userId: 1, createdAt: -1 }); // User quiz listing sorted by date

export default mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
