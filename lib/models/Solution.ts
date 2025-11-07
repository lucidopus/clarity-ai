import mongoose, { Document, Schema } from 'mongoose';

export interface ISolution extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId: string; // YouTube video ID
  problemId: string; // ID of the real-world problem from LearningMaterial
  content: string; // User's solution text (rich text/HTML)
  createdAt: Date;
  updatedAt: Date;
}

const SolutionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: String, required: true },
  problemId: { type: String, required: true },
  content: { type: String, required: true },
}, {
  timestamps: true,
  collection: 'solutions',
});

// Create indexes for efficient queries
SolutionSchema.index({ userId: 1, videoId: 1, problemId: 1 }, { unique: true });
SolutionSchema.index({ userId: 1, videoId: 1 });

export default mongoose.models.Solution || mongoose.model<ISolution>('Solution', SolutionSchema);
