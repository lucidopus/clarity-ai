import mongoose, { Document, Schema } from 'mongoose';

/**
 * SystemLog Model
 * 
 * Generalized logging for internal system decisions, AI classifications, and analytics.
 * Separate from ActivityLog which tracks user engagement for dashboard metrics.
 * 
 * Use cases:
 * - Content validation decisions and user overrides
 * - Cost anomaly detection
 * - Rate limiting events
 * - Error pattern analysis
 * - User feedback tracking
 */

export type SystemLogCategory = 
  | 'content_validation'    // Educational content classification
  | 'cost_anomaly'          // Unusual cost patterns
  | 'rate_limiting'         // Rate limit events
  | 'error_pattern'         // Recurring errors
  | 'user_feedback';        // User-reported issues

export type SystemLogDecision = 'approved' | 'rejected' | 'overridden' | 'error';

export interface ISystemLog extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Core classification
  category: SystemLogCategory;
  eventType: string;           // e.g., 'classification', 'override', 'rejection'
  
  // Context
  userId?: mongoose.Types.ObjectId;
  videoId?: string;            // YouTube video ID
  
  // Decision tracking
  decision: SystemLogDecision;
  confidence?: number;         // 0.0-1.0 for AI decisions
  reason?: string;             // Human-readable explanation
  
  // Override tracking
  wasOverridden?: boolean;
  overriddenAt?: Date;
  overrideReason?: string;     // Optional user-provided reason
  
  // Flexible metadata for category-specific data
  metadata?: Record<string, unknown>;
  
  // Timestamps
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
  videoId: { type: String },
  
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

// Indexes for efficient queries
SystemLogSchema.index({ category: 1, timestamp: -1 });              // Query by category and time
SystemLogSchema.index({ category: 1, wasOverridden: 1 });           // Query overrides for learning
SystemLogSchema.index({ videoId: 1, timestamp: -1 });               // Query by video for debugging
SystemLogSchema.index({ userId: 1, category: 1, timestamp: -1 });   // User-specific analytics

export default mongoose.models.SystemLog || mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
