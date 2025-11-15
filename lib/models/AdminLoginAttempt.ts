import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminLoginAttempt extends Document {
  _id: mongoose.Types.ObjectId;
  ipAddress: string;
  success: boolean;
  timestamp: Date;
  userAgent?: string;
}

const AdminLoginAttemptSchema: Schema = new Schema({
  ipAddress: { type: String, required: true, index: true },
  success: { type: Boolean, required: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
  userAgent: { type: String },
}, {
  timestamps: false,
  collection: 'admin_login_attempts',
});

// Index for rate limiting queries (recent attempts from an IP)
AdminLoginAttemptSchema.index({ ipAddress: 1, timestamp: -1 });

export default mongoose.models.AdminLoginAttempt || mongoose.model<IAdminLoginAttempt>('AdminLoginAttempt', AdminLoginAttemptSchema);
