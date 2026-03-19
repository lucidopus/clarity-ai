import mongoose, { Document, Schema } from 'mongoose';

export interface IChapter {
  id: string;
  topic: string;
  description: string;
  anchor?: string;
  timeSeconds?: number;
  page?: number;
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
  sourceId: string;
  userId: mongoose.Types.ObjectId;
  chapters: IChapter[];
  prerequisites: IPrerequisite[];
  realWorldProblems: IRealWorldProblem[];
  summary: string;
  metadata: {
    generatedBy: string;
    generatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema: Schema = new Schema({
  id: { type: String, required: true },
  topic: { type: String, required: true },
  description: { type: String, required: true },
  anchor: { type: String },
  timeSeconds: { type: Number },
  page: { type: Number },
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
  sourceId: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chapters: [ChapterSchema],
  prerequisites: [PrerequisiteSchema],
  realWorldProblems: [RealWorldProblemSchema],
  summary: { type: String, required: true },
  metadata: {
    generatedBy: { type: String, required: true },
    generatedAt: { type: Date, required: true },
  },
}, {
  timestamps: true,
  collection: 'learningmaterials',
});

// Indexes
LearningMaterialSchema.index({ sourceId: 1, userId: 1 }, { unique: true });

export default mongoose.models.LearningMaterial || mongoose.model<ILearningMaterial>('LearningMaterial', LearningMaterialSchema);
