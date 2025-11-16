import mongoose, { Document, Schema } from 'mongoose';

/**
 * Alert types
 */
export enum AlertType {
  STATISTICAL_OUTLIER = 'STATISTICAL_OUTLIER',
  USER_COST_SPIKE = 'USER_COST_SPIKE',
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  LOW = 'LOW',       // 2-3 standard deviations
  MEDIUM = 'MEDIUM', // 3-4 standard deviations
  HIGH = 'HIGH',     // >4 standard deviations
}

/**
 * Alert status
 */
export enum AlertStatus {
  NEW = 'NEW',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Audit trail entry for status changes
 */
export interface IAuditTrailEntry {
  status: AlertStatus;
  changedBy: mongoose.Types.ObjectId | null; // null for system-generated
  changedAt: Date;
  reason?: string;
}

/**
 * Flexible context object for alert-specific data
 */
export interface IAlertContext {
  // For STATISTICAL_OUTLIER
  date?: Date;
  dailyCost?: number;
  movingAverage7d?: number;
  movingAverage30d?: number;
  stdDev7d?: number;
  stdDev30d?: number;
  threshold?: number;
  percentageAboveNormal?: number;

  // For USER_COST_SPIKE
  userId?: mongoose.Types.ObjectId;
  userName?: string;
  userEmail?: string;
  userDailyAverage?: number;
  userDailyCost?: number;
  recentOperations?: Array<{
    source: string;
    count: number;
  }>;

  // Common context
  periodStart?: Date;
  periodEnd?: Date;
  affectedResource?: string; // "system" or userId string
}

/**
 * Alert document interface
 */
export interface IAlert extends Document {
  _id: mongoose.Types.ObjectId;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  context: IAlertContext;
  message: string;
  description?: string;
  auditTrail: IAuditTrailEntry[];
  createdAt: Date;
  updatedAt: Date;

  // Deprecated fields (use auditTrail instead)
  acknowledgedAt?: Date;
  acknowledgedBy?: mongoose.Types.ObjectId;
}

/**
 * Schema for audit trail entry (embedded)
 */
const AuditTrailEntrySchema: Schema = new Schema({
  status: {
    type: String,
    required: true,
    enum: Object.values(AlertStatus),
  },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  changedAt: { type: Date, required: true },
  reason: { type: String },
}, { _id: false });

/**
 * Main alert schema
 */
const AlertSchema: Schema = new Schema({
  type: {
    type: String,
    required: true,
    enum: Object.values(AlertType),
  },
  severity: {
    type: String,
    required: true,
    enum: Object.values(AlertSeverity),
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(AlertStatus),
    default: AlertStatus.NEW,
  },
  context: {
    type: Schema.Types.Mixed,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  description: { type: String },
  auditTrail: {
    type: [AuditTrailEntrySchema],
    default: [],
  },

  // Deprecated fields (kept for backward compatibility)
  acknowledgedAt: { type: Date },
  acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  collection: 'alerts',
});

// Create indexes for fast queries
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ type: 1, status: 1 });
AlertSchema.index({ 'context.userId': 1 });
AlertSchema.index({ status: 1 });

export default mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);
