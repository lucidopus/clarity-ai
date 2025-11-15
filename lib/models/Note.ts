import mongoose, { Schema } from 'mongoose';
import { INote } from '@/lib/types/notes';

const SegmentNoteSchema: Schema = new Schema({
  segmentId: { type: String, required: true },
  content: { type: String, required: true },
}, { timestamps: true });

const NoteSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: String, required: true },
  generalNote: { type: String, default: '' },
  segmentNotes: [SegmentNoteSchema],
}, {
  timestamps: true,
  collection: 'notes',
});

NoteSchema.index({ videoId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
