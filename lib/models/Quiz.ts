import mongoose, { Document, Schema } from 'mongoose';
import type { BloomLevel, IFlashcardSourceRef } from './Flashcard';

export interface IQuizRichOption {
  text: string;
  isCorrect: boolean;
  /** For distractors: the misconception this option traps. Undefined for the correct option. */
  misconception?: string;
}

export interface IQuiz extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceId: string;
  questionText: string;
  /** Legacy plain-text options. Always populated for back-compat. */
  options: string[];
  /** Legacy index of the correct answer in `options`. Always populated for back-compat. */
  correctAnswerIndex: number;
  /**
   * Rich options with per-distractor misconception tags.
   * Optional for back-compat: quizzes generated before this field existed only have `options`.
   * When present, UI surfaces the trapped misconception on a wrong-answer to teach the lesson.
   */
  richOptions?: IQuizRichOption[];
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** Bloom's taxonomy level. Optional for back-compat. */
  bloomLevel?: BloomLevel;
  /** Pointer to where in the source this question was derived from. */
  sourceRef?: IFlashcardSourceRef;
  generationType: 'ai';
  createdAt: Date;
  updatedAt: Date;
}

const QuizRichOptionSchema = new Schema<IQuizRichOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  misconception: { type: String },
}, { _id: false });

const QuizSourceRefSchema = new Schema<IFlashcardSourceRef>({
  startTime: { type: Number },
  endTime: { type: Number },
  page: { type: Number },
  quote: { type: String },
}, { _id: false });

const QuizSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceId: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true },
  richOptions: { type: [QuizRichOptionSchema], required: false },
  explanation: { type: String },
  difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
  bloomLevel: { type: String, required: false, enum: ['recall', 'understand', 'apply', 'analyze'] },
  sourceRef: { type: QuizSourceRefSchema, required: false },
  generationType: { type: String, required: true, enum: ['ai'] },
}, {
  timestamps: true,
  collection: 'quizzes',
});

// Indexes
QuizSchema.index({ sourceId: 1, userId: 1 });
QuizSchema.index({ userId: 1, createdAt: -1 }); // User quiz listing sorted by date

export default mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
