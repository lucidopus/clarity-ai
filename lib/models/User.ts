import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  userType: 'Graduate' | 'Undergraduate' | 'Other';
  customUserType?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  passwordHash: { type: String, required: true },
  userType: { type: String, required: true, enum: ['Graduate', 'Undergraduate', 'Other'] },
  customUserType: { type: String, required: function(this: IUser) { return this.userType === 'Other'; } },
  email: { type: String },
}, {
  timestamps: true,
});

// Create indexes
UserSchema.index({ username: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);