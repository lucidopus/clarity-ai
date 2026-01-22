import mongoose, { Document, Schema } from 'mongoose';

/**
 * ClassificationLog Model
 * 
 * Generalized logging for AI classification decisions and user overrides.
 * Can be used for:
 * - Content validation (educational vs non-educational)
 * - Category classification
 * - Content moderation
 * - Any future classification needs
 * 
 * Designed for:
 * - Measuring classification accuracy
 * - Identifying false positives (when users override)
 * - ML training data collection
 * - Analytics on decision patterns
 */

export type ClassificationType = 'content_validation' | 'category_prediction' | 'content_moderation';

export interface IClassificationLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  resourceId: string; // Generic ID (videoId, contentId, etc.)
  resourceType: string; // 'video', 'document', etc.
  classificationType: ClassificationType;
  
  // Classification result
  decision: string; // e.g., 'educational', 'non_educational', 'approved', 'rejected'
  confidence: number; // 0.0 - 1.0
  reason: string;
  metadata?: Record<string, unknown>; // Flexible metadata (suggestedCategory, etc.)
  
  // User action
  wasOverridden: boolean;
  overriddenAt?: Date;
  overrideReason?: string; // Optional user feedback on why they overrode
  
  // Cost tracking
  inputTokens: number;
  outputTokens: number;
  cost: number;
  durationMs: number;
  
  // Model info (renamed from 'model' to avoid conflict with Mongoose Document interface)
  modelName: string;
  inputLength: number; // Characters or tokens sent
  
  createdAt: Date;
  updatedAt: Date;
}

const ClassificationLogSchema: Schema<IClassificationLog> = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'User' },
  resourceId: { type: String, required: true, index: true },
  resourceType: { type: String, required: true, default: 'video' },
  classificationType: { 
    type: String, 
    required: true, 
    enum: ['content_validation', 'category_prediction', 'content_moderation'],
    index: true 
  },
  
  // Classification result
  decision: { type: String, required: true, index: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  reason: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  
  // User action
  wasOverridden: { type: Boolean, default: false, index: true },
  overriddenAt: { type: Date },
  overrideReason: { type: String },
  
  // Cost tracking
  inputTokens: { type: Number, required: true },
  outputTokens: { type: Number, required: true },
  cost: { type: Number, required: true },
  durationMs: { type: Number, required: true },
  
  // Model info
  modelName: { type: String, required: true },
  inputLength: { type: Number, required: true },
}, {
  timestamps: true,
  collection: 'classification_logs',
});

// Indexes for analytics queries
ClassificationLogSchema.index({ classificationType: 1, decision: 1, createdAt: -1 }); // Filter by type and decision
ClassificationLogSchema.index({ classificationType: 1, wasOverridden: 1, createdAt: -1 }); // Find overrides by type
ClassificationLogSchema.index({ confidence: 1 }); // Analyze by confidence
ClassificationLogSchema.index({ userId: 1, resourceId: 1, classificationType: 1 }, { unique: true }); // One classification per resource per type

export default mongoose.models.ClassificationLog || mongoose.model<IClassificationLog>('ClassificationLog', ClassificationLogSchema);

