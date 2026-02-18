import mongoose, { Document, Schema } from 'mongoose';

export interface IVerificationToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  type: string;
  attempts: number;
  resendCount: number;
  lastAttemptAt?: Date;
  lastResendAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

const VerificationTokenSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  type: { type: String, required: true, default: 'email_verification' },
  attempts: { type: Number, default: 0 },
  resendCount: { type: Number, default: 0 },
  lastAttemptAt: { type: Date },
  lastResendAt: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // TTL index: 600 seconds = 10 minutes
  expiresAt: { type: Date, required: true },
});

// Compound index for faster lookups by user and type
VerificationTokenSchema.index({ userId: 1, type: 1 });

export default mongoose.models.VerificationToken || mongoose.model<IVerificationToken>('VerificationToken', VerificationTokenSchema);
