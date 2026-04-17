import mongoose, { Document, Schema } from 'mongoose';
import { ServiceType, CostSource } from '@/lib/cost/enums';

export { ServiceType, CostSource };

export interface IUnitDetails {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface IServiceUsage {
  service: ServiceType;
  usage: {
    cost: number;
    unitDetails: IUnitDetails;
  };
  status: 'success' | 'failed' | 'rejected';
  errorMessage?: string;
}

export interface ICost extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  source: CostSource;
  sourceId?: mongoose.Types.ObjectId | string;
  transcriptId?: mongoose.Types.ObjectId;
  problemId?: mongoose.Types.ObjectId | string;
  services: IServiceUsage[];
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

const UnitDetailsSchema: Schema = new Schema({
  inputTokens: { type: Number },
  outputTokens: { type: Number },
  totalTokens: { type: Number },
  duration: { type: Number },
  metadata: { type: Schema.Types.Mixed },
}, { _id: false });

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
    enum: ['success', 'failed', 'rejected']
  },
  errorMessage: { type: String },
}, { _id: false });

const CostSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  source: {
    type: String,
    required: true,
    enum: Object.values(CostSource),
  },
  sourceId: {
    type: Schema.Types.Mixed,
  },
  transcriptId: { type: Schema.Types.ObjectId },
  problemId: {
    type: Schema.Types.Mixed,
  },
  services: { type: [ServiceUsageSchema], required: true },
  totalCost: { type: Number, required: true, min: 0 },
}, {
  timestamps: true,
  collection: 'costs',
});

// Indexes
CostSchema.index({ userId: 1, createdAt: -1 });
CostSchema.index({ source: 1 });
CostSchema.index({ userId: 1, source: 1, createdAt: -1 });
CostSchema.index({ sourceId: 1 });
CostSchema.index({ problemId: 1 });
CostSchema.index({ 'services.service': 1 });
CostSchema.index({ createdAt: -1 });

export default mongoose.models.Cost || mongoose.model<ICost>('Cost', CostSchema);
