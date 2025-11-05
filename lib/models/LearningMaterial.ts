import mongoose, { Document, Schema } from 'mongoose';

export interface ITimestamp {
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

export interface ILearningMaterial extends Document {
  _id: mongoose.Types.ObjectId;
  videoId: string; // YouTube video ID
  userId: mongoose.Types.ObjectId;
  timestamps: ITimestamp[];
  prerequisites: IPrerequisite[];
  videoSummary: string;
  metadata: {
    generatedBy: string;
    generatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TimestampSchema: Schema = new Schema({
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

const LearningMaterialSchema: Schema = new Schema({
  videoId: { type: String, required: true }, // YouTube video ID (e.g., "dQw4w9WgXcQ")
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamps: [TimestampSchema],
  prerequisites: [PrerequisiteSchema],
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