import mongoose, { Document, Schema } from 'mongoose';

// Learning-specific preferences (from onboarding flow)
export interface ILearningPreferences {
  // Step 1: Learning Goals & Context
  role?: 'Student' | 'Teacher' | 'Working Professional' | 'Content Creator';
  learningGoals: string[];
  learningGoalText?: string;

  // Step 2: Learning Challenges
  learningChallenges?: string[];
  learningChallengesText?: string;

  // Step 3 & 4: Personality Profile (research-backed traits, 1-7 scale)
  personalityProfile?: {
    conscientiousness: number;
    emotionalStability: number;
    selfEfficacy: number;
    masteryOrientation: number;
    performanceOrientation: number;
  };

  // Step 5: Material & Time Preferences
  preferredMaterialsRanked?: string[]; // Max 3 items, ordered
  dailyTimeMinutes?: number;
}

// General app preferences (from Settings page)
export interface IGeneralPreferences {
  emailNotifications?: boolean;
  studyReminders?: boolean;
  autoplayVideos?: boolean;
}

// Root preferences interface
export interface IUserPreferences {
  learning?: ILearningPreferences;
  general?: IGeneralPreferences;

  // Flat fields for onboarding flow compatibility (will be mapped to learning.*)
  role?: 'Student' | 'Teacher' | 'Working Professional' | 'Content Creator';
  learningGoals?: string[];
  learningGoalText?: string;
  learningChallenges?: string[];
  learningChallengesText?: string;
  personalityProfile?: {
    conscientiousness: number;
    emotionalStability: number;
    selfEfficacy: number;
    masteryOrientation: number;
    performanceOrientation: number;
  };
  preferredMaterialsRanked?: string[];
  dailyTimeMinutes?: number;
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
    // Learning preferences (from onboarding)
    learning: {
      role: { type: String, enum: ['Student', 'Teacher', 'Working Professional', 'Content Creator'] },
      learningGoals: [{ type: String }],
      learningGoalText: { type: String },
      learningChallenges: [{ type: String }],
      learningChallengesText: { type: String },
      personalityProfile: {
        conscientiousness: { type: Number, min: 1, max: 7 },
        emotionalStability: { type: Number, min: 1, max: 7 },
        selfEfficacy: { type: Number, min: 1, max: 7 },
        masteryOrientation: { type: Number, min: 1, max: 7 },
        performanceOrientation: { type: Number, min: 1, max: 7 },
      },
      preferredMaterialsRanked: [{ type: String }],
      dailyTimeMinutes: { type: Number, min: 0 },
    },

    // General app preferences (from Settings page)
    general: {
      emailNotifications: { type: Boolean, default: true },
      studyReminders: { type: Boolean, default: true },
      autoplayVideos: { type: Boolean, default: false },
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
