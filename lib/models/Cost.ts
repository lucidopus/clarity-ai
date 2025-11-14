import mongoose, { Document, Schema } from 'mongoose';

/**
 * Service types for cost tracking
 */
export enum ServiceType {
  GROQ_LLM = 'groq_llm',
  APIFY_TRANSCRIPT = 'apify_transcript',
}

/**
 * Unit details for service usage (optional fields for flexibility)
 */
export interface IUnitDetails {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  duration?: number; // in milliseconds
  metadata?: Record<string, any>;
}

/**
 * Service usage record
 */
export interface IServiceUsage {
  service: ServiceType;
  usage: {
    cost: number; // in USD
    unitDetails: IUnitDetails;
  };
  status: 'success' | 'failed';
  errorMessage?: string;
}

/**
 * Cost tracking document
 */
export interface ICost extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId?: mongoose.Types.ObjectId;
  transcriptId?: mongoose.Types.ObjectId;
  services: IServiceUsage[];
  totalCost: number; // denormalized for fast queries (sum of all service costs)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for unit details (embedded)
 */
const UnitDetailsSchema: Schema = new Schema({
  inputTokens: { type: Number },
  outputTokens: { type: Number },
  totalTokens: { type: Number },
  duration: { type: Number },
  metadata: { type: Schema.Types.Mixed },
}, { _id: false });

/**
 * Schema for service usage (embedded)
 */
const ServiceUsageSchema: Schema = new Schema({
  service: {
    type: String,
    required: true,
    enum: Object.values(ServiceType)
  },
  usage: {
    cost: { type: Number, required: true, min: 0 },
    unitDetails: { type: UnitDetailsSchema, required: true },
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failed']
  },
  errorMessage: { type: String },
}, { _id: false });

/**
 * Main cost tracking schema
 */
const CostSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
  transcriptId: { type: Schema.Types.ObjectId },
  services: { type: [ServiceUsageSchema], required: true },
  totalCost: { type: Number, required: true, min: 0 },
}, {
  timestamps: true,
  collection: 'costs',
});

// Create indexes for fast aggregations and queries
CostSchema.index({ userId: 1, createdAt: -1 });
CostSchema.index({ videoId: 1 });
CostSchema.index({ 'services.service': 1 });
CostSchema.index({ createdAt: -1 });

export default mongoose.models.Cost || mongoose.model<ICost>('Cost', CostSchema);
