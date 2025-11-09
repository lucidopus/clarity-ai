import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPreferences {
  role: 'Student' | 'Teacher' | 'Professional Learner' | 'Content Creator';
  learningGoals: string[];
  learningGoalText?: string;
  preferredContentTypes: {
    type: 'Videos' | 'Flashcards' | 'Quizzes' | 'Transcripts' | 'Interactive Summaries';
    frequency: 'Daily' | 'Weekly' | 'Monthly' | 'As needed';
  }[];
  subjects: string[];
  expertiseLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  learningStyle: ('Visual' | 'Auditory' | 'Reading/Writing' | 'Kinesthetic')[];
  technicalComfort: 'Beginner' | 'Intermediate' | 'Advanced';
  accessibility: {
    largerText: boolean;
    voiceNarration: boolean;
    simplifiedInterface: boolean;
  };
  timePreferences: {
    availableTimePerDay: number; // hours
    availableTimePerWeek: number; // hours
    preferredSessionLength: number; // minutes
    notificationsEnabled: boolean;
  };
  additionalPreferences: {
    collaborationEnabled: boolean;
    dataPrivacyLevel: 'Standard' | 'Enhanced';
  };
  generalPreferences?: {
    emailNotifications: boolean;
    studyReminders: boolean;
    autoPlayVideos: boolean;
  };
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  userType: 'Graduate' | 'Undergraduate' | 'Other';
  customUserType?: string;
  email: string;
  preferences?: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
  // Streak tracking fields
  lastLoginDate?: Date;
  loginStreak: number;
  longestStreak: number;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  passwordHash: { type: String, required: true },
  userType: { type: String, required: true, enum: ['Graduate', 'Undergraduate', 'Other'] },
  customUserType: { type: String, required: function(this: IUser) { return this.userType === 'Other'; } },
  email: { type: String, required: true },
  preferences: {
    role: { type: String, enum: ['Student', 'Teacher', 'Professional Learner', 'Content Creator'] },
    learningGoals: [{ type: String }],
    learningGoalText: { type: String, maxlength: 500 },
    preferredContentTypes: [{
      type: { type: String, enum: ['Videos', 'Flashcards', 'Quizzes', 'Transcripts', 'Interactive Summaries'] },
      frequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly', 'As needed'] },
    }],
    subjects: [{ type: String }],
    expertiseLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
    learningStyle: [{ type: String, enum: ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'] }],
    technicalComfort: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
    accessibility: {
      largerText: { type: Boolean, default: false },
      voiceNarration: { type: Boolean, default: false },
      simplifiedInterface: { type: Boolean, default: false },
    },
    timePreferences: {
      availableTimePerDay: { type: Number, min: 0 },
      availableTimePerWeek: { type: Number, min: 0 },
      preferredSessionLength: { type: Number, min: 5 },
      notificationsEnabled: { type: Boolean, default: true },
    },
    additionalPreferences: {
      collaborationEnabled: { type: Boolean, default: false },
      dataPrivacyLevel: { type: String, enum: ['Standard', 'Enhanced'], default: 'Standard' },
    },
    generalPreferences: {
      emailNotifications: { type: Boolean, default: true },
      studyReminders: { type: Boolean, default: true },
      autoPlayVideos: { type: Boolean, default: false },
    },
  },
  // Streak tracking fields with defaults
  lastLoginDate: { type: Date, default: null },
  loginStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'users', // Explicit collection name
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);