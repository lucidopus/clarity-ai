import mongoose, { Document, Schema } from 'mongoose';

export type SystemLogCategory =
  | 'content_validation'
  | 'cost_anomaly'
  | 'rate_limiting'
  | 'error_pattern'
  | 'user_feedback';

export type SystemLogDecision = 'approved' | 'rejected' | 'overridden' | 'error';

export interface ISystemLog extends Document {
  _id: mongoose.Types.ObjectId;
  category: SystemLogCategory;
  eventType: string;
  userId?: mongoose.Types.ObjectId;
  sourceId?: string;
  decision: SystemLogDecision;
  confidence?: number;
  reason?: string;
  wasOverridden?: boolean;
  overriddenAt?: Date;
  overrideReason?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SystemLogSchema: Schema<ISystemLog> = new Schema({
  category: {
    type: String,
    required: true,
    enum: ['content_validation', 'cost_anomaly', 'rate_limiting', 'error_pattern', 'user_feedback'],
    index: true,
  },
  eventType: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  sourceId: { type: String },
  decision: {
    type: String,
    required: true,
    enum: ['approved', 'rejected', 'overridden', 'error'],
  },
  confidence: { type: Number, min: 0, max: 1 },
  reason: { type: String },
  wasOverridden: { type: Boolean, default: false },
  overriddenAt: { type: Date },
  overrideReason: { type: String },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, required: true, default: () => new Date() },
}, {
  timestamps: true,
  collection: 'system_logs',
});

// Indexes
SystemLogSchema.index({ category: 1, timestamp: -1 });
SystemLogSchema.index({ category: 1, wasOverridden: 1 });
SystemLogSchema.index({ sourceId: 1, timestamp: -1 });
SystemLogSchema.index({ userId: 1, category: 1, timestamp: -1 });

export default mongoose.models.SystemLog || mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
