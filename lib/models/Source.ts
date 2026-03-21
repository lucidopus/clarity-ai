import mongoose, { Document, Schema } from 'mongoose';

export type SourceType = 'youtube' | 'document' | 'audio' | 'media' | 'text' | 'live_lecture';

export interface ISource extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceId: string;
  sourceType: SourceType;
  sourceUrl?: string;
  title: string;
  channelName?: string;
  thumbnail?: string;
  duration?: number;
  language: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'completed_with_warning' | 'failed' | 'validation_rejected';
  materialsStatus: 'complete' | 'incomplete' | 'generating';
  incompleteMaterials?: ('metadata' | 'flashcards' | 'quizzes' | 'prerequisites' | 'mindmap' | 'casestudies')[];
  summary?: string;
  tags?: string[];
  category?: string;
  embedding?: number[];
  visibility: 'private' | 'public';
  // Upload-specific (document, audio, media)
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  // Error tracking
  errorType?: string;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceId: { type: String, required: true },
  sourceType: { type: String, required: true, enum: ['youtube', 'document', 'audio', 'media', 'text', 'live_lecture'] },
  sourceUrl: { type: String },
  title: { type: String, required: true },
  channelName: { type: String },
  thumbnail: { type: String },
  duration: { type: Number },
  language: { type: String, default: 'en' },
  processingStatus: { type: String, required: true, enum: ['pending', 'processing', 'completed', 'completed_with_warning', 'failed', 'validation_rejected'] },
  materialsStatus: { type: String, enum: ['complete', 'incomplete', 'generating'], default: 'generating' },
  incompleteMaterials: [{ type: String, enum: ['metadata', 'flashcards', 'quizzes', 'prerequisites', 'mindmap', 'casestudies'] }],
  summary: { type: String },
  tags: [{ type: String }],
  category: { type: String },
  embedding: { type: [Number], select: false },
  visibility: { type: String, enum: ['private', 'public'], default: 'public' },
  // Upload-specific fields
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  // Error tracking
  errorType: { type: String },
  errorMessage: { type: String },
  processedAt: { type: Date },
}, {
  timestamps: true,
  collection: 'sources',
});

// Indexes
SourceSchema.index({ userId: 1, createdAt: -1 });
SourceSchema.index({ sourceId: 1 });
SourceSchema.index({ userId: 1, sourceId: 1 }, { unique: true });
SourceSchema.index({ userId: 1, sourceType: 1, createdAt: -1 });
SourceSchema.index({ visibility: 1, createdAt: -1 });

export default mongoose.models.Source || mongoose.model<ISource>('Source', SourceSchema);
