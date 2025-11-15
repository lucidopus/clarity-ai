import mongoose, { Document, Schema } from 'mongoose';

/**
 * Service aggregation data
 */
export interface IServiceAggregation {
  service: string;
  cost: number;
  operations: number;
  avgCostPerOp: number;
}

/**
 * Source aggregation data
 */
export interface ISourceAggregation {
  source: string;
  cost: number;
  operations: number;
  percentage: number;
}

/**
 * Model aggregation data
 */
export interface IModelAggregation {
  model: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  operations: number;
  costPerToken: number;
}

/**
 * User aggregation data
 */
export interface IUserAggregation {
  userId: mongoose.Types.ObjectId;
  cost: number;
  operations: number;
}

/**
 * Pre-computed cost aggregation document (calculated nightly)
 */
export interface ICostAggregation extends Document {
  _id: mongoose.Types.ObjectId;
  date: Date; // Date this aggregation represents (YYYY-MM-DD 00:00:00 UTC)

  // Daily totals
  dailyTotalCost: number;
  dailyInputTokens: number;
  dailyOutputTokens: number;
  dailyTotalTokens: number;
  dailyOperations: number;

  // Aggregations by dimension
  byService: IServiceAggregation[];
  bySource: ISourceAggregation[];
  byModel: IModelAggregation[];
  byUser: IUserAggregation[];

  // Statistical metrics (calculated at end of day)
  movingAverage7d: number;  // 7-day moving average of daily cost
  movingAverage30d: number; // 30-day moving average of daily cost
  stdDev7d: number;         // 7-day standard deviation
  stdDev30d: number;        // 30-day standard deviation

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for service aggregation (embedded)
 */
const ServiceAggregationSchema: Schema = new Schema({
  service: { type: String, required: true },
  cost: { type: Number, required: true, min: 0 },
  operations: { type: Number, required: true, min: 0 },
  avgCostPerOp: { type: Number, required: true, min: 0 },
}, { _id: false });

/**
 * Schema for source aggregation (embedded)
 */
const SourceAggregationSchema: Schema = new Schema({
  source: { type: String, required: true },
  cost: { type: Number, required: true, min: 0 },
  operations: { type: Number, required: true, min: 0 },
  percentage: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });

/**
 * Schema for model aggregation (embedded)
 */
const ModelAggregationSchema: Schema = new Schema({
  model: { type: String, required: true },
  cost: { type: Number, required: true, min: 0 },
  inputTokens: { type: Number, required: true, min: 0 },
  outputTokens: { type: Number, required: true, min: 0 },
  totalTokens: { type: Number, required: true, min: 0 },
  operations: { type: Number, required: true, min: 0 },
  costPerToken: { type: Number, required: true, min: 0 },
}, { _id: false });

/**
 * Schema for user aggregation (embedded)
 */
const UserAggregationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cost: { type: Number, required: true, min: 0 },
  operations: { type: Number, required: true, min: 0 },
}, { _id: false });

/**
 * Main cost aggregation schema
 */
const CostAggregationSchema: Schema = new Schema({
  date: {
    type: Date,
    required: true,
    unique: true, // One aggregation per day
  },

  // Daily totals
  dailyTotalCost: { type: Number, required: true, min: 0, default: 0 },
  dailyInputTokens: { type: Number, required: true, min: 0, default: 0 },
  dailyOutputTokens: { type: Number, required: true, min: 0, default: 0 },
  dailyTotalTokens: { type: Number, required: true, min: 0, default: 0 },
  dailyOperations: { type: Number, required: true, min: 0, default: 0 },

  // Aggregations
  byService: { type: [ServiceAggregationSchema], default: [] },
  bySource: { type: [SourceAggregationSchema], default: [] },
  byModel: { type: [ModelAggregationSchema], default: [] },
  byUser: { type: [UserAggregationSchema], default: [] },

  // Statistical metrics
  movingAverage7d: { type: Number, default: 0 },
  movingAverage30d: { type: Number, default: 0 },
  stdDev7d: { type: Number, default: 0 },
  stdDev30d: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'cost_aggregations',
});

// Create indexes for fast queries
CostAggregationSchema.index({ date: -1 }); // Most recent first
CostAggregationSchema.index({ 'byUser.userId': 1 }); // User-specific queries

export default mongoose.models.CostAggregation || mongoose.model<ICostAggregation>('CostAggregation', CostAggregationSchema);
