import mongoose, { Document, Schema } from 'mongoose';

export type LiveSessionStatus = 'active' | 'ended' | 'interrupted';
export type AudioSource = 'mic' | 'system';
export type LiveSessionProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type LiveSessionErrorType =
  | 'scribe_connection_lost'
  | 'scribe_reconnect_failed'
  | 'context_doc_extraction_failed'
  | 'qa_llm_failed'
  | 'sync_failed'
  | 'mic_permission_revoked'
  | 'post_processing_failed';

export interface ITranscriptSegment {
  text: string;
  startOffset: number;          // Seconds since lecture start
  endOffset: number;
  committedAt: Date;
}

export interface IImportanceMarker {
  offsetSeconds: number;        // Seconds since lecture start
  notePosition?: number;        // Cursor position in notes
  createdAt: Date;
}

export interface ILiveSessionError {
  type: LiveSessionErrorType;
  message: string;
  timestamp: Date;
  recoverable: boolean;
  resolved: boolean;
}

export interface ILiveSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionId: string;            // UUID, unique
  title: string;
  status: LiveSessionStatus;
  audioSource: AudioSource;

  // Timing
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;

  // Learner content
  focusNotes: string;
  importanceMarkers: IImportanceMarker[];

  // Transcript (accumulated via 10-second batch sync)
  transcriptSegments: ITranscriptSegment[];
  lastSyncedAt?: Date;

  // Context
  contextDocIds: string[];      // Source IDs (max 2)

  // Q&A
  questionCount: number;

  // Post-lecture
  sourceId?: string;
  processingStatus?: LiveSessionProcessingStatus;

  // Error tracking
  sessionErrors: ILiveSessionError[];

  createdAt: Date;
  updatedAt: Date;
}

const TranscriptSegmentSchema: Schema = new Schema({
  text: { type: String, required: true },
  startOffset: { type: Number, required: true },
  endOffset: { type: Number, required: true },
  committedAt: { type: Date, required: true },
}, { _id: false });

const ImportanceMarkerSchema: Schema = new Schema({
  offsetSeconds: { type: Number, required: true },
  notePosition: { type: Number },
  createdAt: { type: Date, required: true },
}, { _id: false });

const LiveSessionErrorSchema: Schema = new Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'scribe_connection_lost', 'scribe_reconnect_failed',
      'context_doc_extraction_failed', 'qa_llm_failed',
      'sync_failed', 'mic_permission_revoked', 'post_processing_failed',
    ],
  },
  message: { type: String, required: true },
  timestamp: { type: Date, required: true },
  recoverable: { type: Boolean, required: true },
  resolved: { type: Boolean, default: false },
}, { _id: false });

const LiveSessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  title: { type: String, required: true },
  status: { type: String, required: true, enum: ['active', 'ended', 'interrupted'], default: 'active' },
  audioSource: { type: String, required: true, enum: ['mic', 'system'] },

  // Timing
  startedAt: { type: Date, required: true },
  endedAt: { type: Date },
  durationSeconds: { type: Number },

  // Learner content
  focusNotes: { type: String, default: '' },
  importanceMarkers: { type: [ImportanceMarkerSchema], default: [] },

  // Transcript
  transcriptSegments: { type: [TranscriptSegmentSchema], default: [] },
  lastSyncedAt: { type: Date },

  // Context
  contextDocIds: { type: [String], default: [] },

  // Q&A
  questionCount: { type: Number, default: 0 },

  // Post-lecture
  sourceId: { type: String },
  processingStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },

  // Error tracking
  sessionErrors: { type: [LiveSessionErrorSchema], default: [] },
}, {
  timestamps: true,
  collection: 'livesessions',
});

// Indexes
LiveSessionSchema.index({ userId: 1, status: 1 });
LiveSessionSchema.index({ sessionId: 1 }, { unique: true });
LiveSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.LiveSession || mongoose.model<ILiveSession>('LiveSession', LiveSessionSchema);
