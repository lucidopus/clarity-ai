import mongoose, { Document, Schema } from 'mongoose';

export interface ISolution extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceId: string;
  problemId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const SolutionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceId: { type: String, required: true },
  problemId: { type: String, required: true },
  content: { type: String, required: false, default: '' },
}, {
  timestamps: true,
  collection: 'solutions',
});

// Indexes
SolutionSchema.index({ userId: 1, sourceId: 1, problemId: 1 }, { unique: true });
SolutionSchema.index({ userId: 1, sourceId: 1 });

export default mongoose.models.Solution || mongoose.model<ISolution>('Solution', SolutionSchema);
