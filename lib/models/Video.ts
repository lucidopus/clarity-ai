import mongoose, { Document, Schema } from 'mongoose';

export interface ITranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang: string;
}

export interface IVideo extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  youtubeUrl: string;
  videoId: string;
  title: string;
  channelName?: string;
  thumbnail?: string;
  duration?: number;
  transcript: ITranscriptSegment[];
  language: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'completed_with_warning' | 'failed';
  errorType?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

const TranscriptSegmentSchema: Schema = new Schema({
  text: { type: String, required: true },
  offset: { type: Number, required: true },
  duration: { type: Number, required: true },
  lang: { type: String, required: true },
}, { _id: false });

const VideoSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  youtubeUrl: { type: String, required: true },
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  channelName: { type: String },
  thumbnail: { type: String },
  duration: { type: Number },
  transcript: [TranscriptSegmentSchema],
  language: { type: String, default: 'en' },
  processingStatus: { type: String, required: true, enum: ['pending', 'processing', 'completed', 'completed_with_warning', 'failed'] },
  errorType: { type: String },
  errorMessage: { type: String },
  processedAt: { type: Date },
}, {
  timestamps: true,
  collection: 'videos', // Explicit collection name
});

// Create indexes
VideoSchema.index({ userId: 1, createdAt: -1 });
VideoSchema.index({ videoId: 1 });
VideoSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export default mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema);