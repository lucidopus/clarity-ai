import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITodaysMixItem {
  type: 'flashcard-review' | 'quiz';
  sourceId?: string;
  sourceTitle?: string;
  itemIds: string[];
  estimatedMinutes: number;
  completed: boolean;
}

export interface ITodaysMix extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD (UTC)
  items: ITodaysMixItem[];
  totalMinutes: number;
  targetMinutes: number;
  completed: boolean;
  completedAt?: Date;
}

const TodaysMixItemSchema = new Schema<ITodaysMixItem>(
  {
    type: { type: String, enum: ['flashcard-review', 'quiz'], required: true },
    sourceId: { type: String },
    sourceTitle: { type: String },
    itemIds: [{ type: String }],
    estimatedMinutes: { type: Number, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const TodaysMixSchema = new Schema<ITodaysMix>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    items: [TodaysMixItemSchema],
    totalMinutes: { type: Number, required: true },
    targetMinutes: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

TodaysMixSchema.index({ userId: 1, date: 1 }, { unique: true });

const TodaysMix: Model<ITodaysMix> =
  mongoose.models.TodaysMix || mongoose.model<ITodaysMix>('TodaysMix', TodaysMixSchema);

export default TodaysMix;
