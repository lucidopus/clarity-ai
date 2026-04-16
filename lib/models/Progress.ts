import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizAttempt {
  quizId: mongoose.Types.ObjectId;
  score: number;
  attemptNumber: number;
  userAnswerIndex?: number;
  confidenceRating?: number; // 1 = Guessing, 2 = Somewhat Sure, 3 = Confident
  completedAt: Date;
}

export interface ICalibrationEntry {
  date: Date;
  brierScore: number;
  totalQuestions: number;
  misinformedCount: number;
  misinformedQuizIds: mongoose.Types.ObjectId[];
}

export interface IClarityScore {
  score: number;
  quizDimension: number;
  masteryDimension: number;
  coverageDimension: number;
  trendDimension: number;
  computedAt: Date;
}

/** @deprecated Use IClarityScore */
export type IReadinessScore = IClarityScore;

export interface IDocumentReadiness {
  pageCount: number;
  greenPages: number;
  yellowPages: number;
  redPages: number;
  updatedAt: Date;
}

export interface IProgress extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceId: string;
  masteredFlashcardIds: mongoose.Types.ObjectId[];
  masteredQuizIds: mongoose.Types.ObjectId[];
  quizAttempts: IQuizAttempt[];
  calibrationHistory: ICalibrationEntry[];
  readinessScore?: IReadinessScore;
  documentReadiness?: IDocumentReadiness;
  /** UTC YYYY-MM-DD of the last day we counted a document_study_session for
   *  this source. Used to dedupe — a single doc can only credit one study
   *  session per calendar day, preventing scroll-spam from inflating streaks. */
  documentSessionLoggedOn?: string;
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
  confidenceRating: { type: Number, min: 1, max: 3 },
  completedAt: { type: Date, required: true },
}, { _id: false });

const CalibrationEntrySchema: Schema = new Schema({
  date: { type: Date, required: true },
  brierScore: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  misinformedCount: { type: Number, required: true },
  misinformedQuizIds: [{ type: Schema.Types.ObjectId, ref: 'Quiz' }],
}, { _id: false });

const ReadinessScoreSchema: Schema = new Schema(
  {
    score: { type: Number, required: true },
    quizDimension: { type: Number, required: true },
    masteryDimension: { type: Number, required: true },
    coverageDimension: { type: Number, required: true },
    trendDimension: { type: Number, required: true },
    computedAt: { type: Date, required: true },
  },
  { _id: false }
);

const DocumentReadinessSchema: Schema = new Schema(
  {
    pageCount: { type: Number, required: true, min: 0 },
    greenPages: { type: Number, required: true, min: 0, default: 0 },
    yellowPages: { type: Number, required: true, min: 0, default: 0 },
    redPages: { type: Number, required: true, min: 0, default: 0 },
    updatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const ProgressSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceId: { type: String, required: true },
  masteredFlashcardIds: [{ type: Schema.Types.ObjectId, ref: 'Flashcard' }],
  masteredQuizIds: [{ type: Schema.Types.ObjectId, ref: 'Quiz' }],
  quizAttempts: [QuizAttemptSchema],
  calibrationHistory: [CalibrationEntrySchema],
  readinessScore: { type: ReadinessScoreSchema, default: null },
  documentReadiness: { type: DocumentReadinessSchema, default: null },
  documentSessionLoggedOn: { type: String, default: null },
  lastAccessedAt: { type: Date, default: Date.now },
  totalStudyTimeSeconds: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'progress',
});

// Indexes
ProgressSchema.index({ userId: 1, sourceId: 1 }, { unique: true });

export default mongoose.models.Progress || mongoose.model<IProgress>('Progress', ProgressSchema);
