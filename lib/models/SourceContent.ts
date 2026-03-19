import mongoose, { Document, Schema } from 'mongoose';

export interface ISegment {
  text: string;
  startTime?: number;
  endTime?: number;
  page?: number;
  lang?: string;
}

export interface ISourceContent extends Document {
  _id: mongoose.Types.ObjectId;
  sourceId: string;
  userId: mongoose.Types.ObjectId;
  fullText: string;
  wordCount: number;
  segments?: ISegment[];
  createdAt: Date;
  updatedAt: Date;
}

const SegmentSchema: Schema = new Schema({
  text: { type: String, required: true },
  startTime: { type: Number },
  endTime: { type: Number },
  page: { type: Number },
  lang: { type: String },
}, { _id: false });

const SourceContentSchema: Schema = new Schema({
  sourceId: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fullText: { type: String, required: true },
  wordCount: { type: Number, required: true },
  segments: [SegmentSchema],
}, {
  timestamps: true,
  collection: 'sourcecontents',
});

// Indexes
SourceContentSchema.index({ sourceId: 1, userId: 1 }, { unique: true });

export default mongoose.models.SourceContent || mongoose.model<ISourceContent>('SourceContent', SourceContentSchema);
