import mongoose, { Document, Schema } from 'mongoose';

export type ActivityType = 'flashcard_viewed' | 'quiz_completed' | 'materials_viewed' | 'flashcard_mastered';

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  activityType: ActivityType;
  videoId?: mongoose.Types.ObjectId;
  date: Date; // date-only (time zeroed out)
  timestamp: Date; // full timestamp
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema: Schema<IActivityLog> = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'User' },
  activityType: { type: String, required: true, enum: ['flashcard_viewed', 'quiz_completed', 'materials_viewed', 'flashcard_mastered'] },
  videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
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

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
