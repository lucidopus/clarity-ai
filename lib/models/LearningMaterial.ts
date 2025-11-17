import mongoose, { Document, Schema } from 'mongoose';

export interface IChapter {
  id: string;
  timeSeconds: number;
  topic: string;
  description: string;
}

export interface IPrerequisite {
  id: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface IRealWorldProblem {
  id: string;
  title: string;
  scenario: string;
  hints: string[];
}

export interface ILearningMaterial extends Document {
  _id: mongoose.Types.ObjectId;
  videoId: string; // YouTube video ID
  userId: mongoose.Types.ObjectId;
  chapters: IChapter[];
  prerequisites: IPrerequisite[];
  realWorldProblems: IRealWorldProblem[];
  videoSummary: string;
  metadata: {
    generatedBy: string;
    generatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema: Schema = new Schema({
  id: { type: String, required: true },
  timeSeconds: { type: Number, required: true },
  topic: { type: String, required: true },
  description: { type: String, required: true },
}, { _id: false });

const PrerequisiteSchema: Schema = new Schema({
  id: { type: String, required: true },
  topic: { type: String, required: true },
  difficulty: { type: String, required: true, enum: ['beginner', 'intermediate', 'advanced'] },
}, { _id: false });

const RealWorldProblemSchema: Schema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  scenario: { type: String, required: true },
  hints: [{ type: String }],
}, { _id: false });

const LearningMaterialSchema: Schema = new Schema({
  videoId: { type: String, required: true }, // YouTube video ID (e.g., "dQw4w9WgXcQ")
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chapters: [ChapterSchema],
  prerequisites: [PrerequisiteSchema],
  realWorldProblems: [RealWorldProblemSchema],
  videoSummary: { type: String, required: true },
  metadata: {
    generatedBy: { type: String, required: true },
    generatedAt: { type: Date, required: true },
  },
}, {
  timestamps: true,
  collection: 'learningmaterials', // Explicit collection name
});

// Create indexes
LearningMaterialSchema.index({ videoId: 1, userId: 1 }, { unique: true });

export default mongoose.models.LearningMaterial || mongoose.model<ILearningMaterial>('LearningMaterial', LearningMaterialSchema);