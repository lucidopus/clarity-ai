import mongoose, { Schema, Document } from 'mongoose';

export interface IGeneration extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  youtubeUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';
  progress: number; // 0-100
  title?: string;
  channelName?: string;
  thumbnailUrl?: string;
  duration?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const GenerationSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
   videoId: {
     type: Schema.Types.ObjectId,
     ref: 'Video',
     required: false,
     index: true
   },
  youtubeUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'canceled'],
    default: 'queued',
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  title: {
    type: String
  },
  channelName: {
    type: String
  },
  thumbnailUrl: {
    type: String
  },
  duration: {
    type: String
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'generations' // Explicit collection name
});

// Indexes for efficient queries
GenerationSchema.index({ userId: 1, status: 1 });
GenerationSchema.index({ userId: 1, createdAt: -1 });
GenerationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Generation || mongoose.model<IGeneration>('Generation', GenerationSchema);