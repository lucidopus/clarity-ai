import mongoose, { Document, Schema } from 'mongoose';

export type ChallengeType = 'review_cards' | 'complete_quiz' | 'process_video' | 'create_flashcards';

export interface IChallenge {
  type: ChallengeType;
  label: string;
  target: number;
  current: number;
  done: boolean;
}

export interface IDailyChallenge extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD (UTC)
  challenges: IChallenge[];
  allCompleted: boolean;
  bonusAwarded: boolean;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    type: { type: String, required: true, enum: ['review_cards', 'complete_quiz', 'process_video', 'create_flashcards'] },
    label: { type: String, required: true },
    target: { type: Number, required: true },
    current: { type: Number, default: 0 },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const DailyChallengeSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    challenges: [ChallengeSchema],
    allCompleted: { type: Boolean, default: false },
    bonusAwarded: { type: Boolean, default: false },
  },
  { timestamps: false, collection: 'daily_challenges' }
);

DailyChallengeSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyChallenge ||
  mongoose.model<IDailyChallenge>('DailyChallenge', DailyChallengeSchema);
