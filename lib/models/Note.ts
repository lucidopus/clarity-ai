import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId: string; // YouTube video ID
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: String, required: true }, // YouTube video ID (e.g., "dQw4w9WgXcQ")
  content: { type: String, default: '' },
}, {
  timestamps: true,
  collection: 'notes',
});

// Create indexes
NoteSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export default mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
