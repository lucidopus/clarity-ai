import mongoose, { Document, Schema } from 'mongoose';

/**
 * Service types for cost tracking
 */
export enum ServiceType {
  GROQ_LLM = 'groq_llm',
  APIFY_TRANSCRIPT = 'apify_transcript',
}

/**
 * Cost source - where the cost originated from
 * Helps track API usage across different features
 */
export enum CostSource {
  // Learning material generation from video transcripts
  LEARNING_MATERIAL_GENERATION = 'learning_material_generation',

  // Chatbot interactions while learning a video's materials
  LEARNING_CHATBOT = 'learning_chatbot',

  // AI Guide for real-world problem-solving workspace
  CHALLENGE_CHATBOT = 'challenge_chatbot',
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
  source: CostSource; // where this cost originated (material generation, learning chatbot, or challenge chatbot)
  videoId?: mongoose.Types.ObjectId | string; // MongoDB ObjectId OR YouTube video ID string
  transcriptId?: mongoose.Types.ObjectId;
  problemId?: mongoose.Types.ObjectId | string; // MongoDB ObjectId OR problem ID string (e.g., "rp1")
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
  source: {
    type: String,
    required: true,
    enum: Object.values(CostSource),
  },
  videoId: {
    type: Schema.Types.Mixed, // Can be MongoDB ObjectId (from video processing) or YouTube video ID string (from chatbots)
    ref: 'Video'
  },
  transcriptId: { type: Schema.Types.ObjectId },
  problemId: {
    type: Schema.Types.Mixed, // Can be MongoDB ObjectId or problem ID string (e.g., "rp1" from challenge chatbot)
  },
  services: { type: [ServiceUsageSchema], required: true },
  totalCost: { type: Number, required: true, min: 0 },
}, {
  timestamps: true,
  collection: 'costs',
});

// Create indexes for fast aggregations and queries
CostSchema.index({ userId: 1, createdAt: -1 });
CostSchema.index({ source: 1 });
CostSchema.index({ userId: 1, source: 1, createdAt: -1 });
CostSchema.index({ videoId: 1 });
CostSchema.index({ problemId: 1 });
CostSchema.index({ 'services.service': 1 });
CostSchema.index({ createdAt: -1 });

export default mongoose.models.Cost || mongoose.model<ICost>('Cost', CostSchema);
