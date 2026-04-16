import mongoose, { Document, Schema } from 'mongoose';

export type ActivityType = 'flashcard_viewed' | 'quiz_completed' | 'materials_viewed' | 'flashcard_mastered' | 'flashcard_created' | 'video_generated' | 'source_generated' | 'chatbot_message_sent' | 'video_started' | 'recommendation_clicked' | 'email_verification_sent' | 'email_verification_success' | 'email_verification_failed' | 'email_verification_resent' | 'live_lecture_started' | 'live_lecture_ended' | 'animation_rendered' | 'document_study_session' | 'page_cleared';

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  activityType: ActivityType;
  sourceId?: string;
  date: Date;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema: Schema<IActivityLog> = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'User' },
  activityType: { type: String, required: true, enum: ['flashcard_viewed', 'quiz_completed', 'materials_viewed', 'flashcard_mastered', 'flashcard_created', 'video_generated', 'source_generated', 'chatbot_message_sent', 'video_started', 'recommendation_clicked', 'email_verification_sent', 'email_verification_success', 'email_verification_failed', 'email_verification_resent', 'live_lecture_started', 'live_lecture_ended', 'animation_rendered', 'document_study_session', 'page_cleared'] },
  sourceId: { type: String },
  date: { type: Date, required: true },
  timestamp: { type: Date, required: true, default: () => new Date() },
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
  collection: 'activity_logs',
});

// Compound indexes for fast aggregations
ActivityLogSchema.index({ userId: 1, date: 1 });
ActivityLogSchema.index({ userId: 1, activityType: 1, date: 1 });
// TTL index: auto-delete activity logs older than 180 days to prevent unbounded growth
ActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
