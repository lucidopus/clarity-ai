import mongoose, { Schema } from 'mongoose';
import { INote } from '@/lib/types/notes';

const SegmentNoteSchema: Schema = new Schema({
  segmentId: { type: String, required: true },
  // Content is optional so a segment record can exist for confidence-only
  // ratings (active-recall signal) without forcing the user to also write a note.
  content: { type: String, default: '' },
  confidence: { type: String, enum: ['red', 'yellow', 'green'], default: undefined },
}, { timestamps: true });

const NoteSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceId: { type: String, required: true },
  generalNote: { type: String, default: '' },
  segmentNotes: [SegmentNoteSchema],
}, {
  timestamps: true,
  collection: 'notes',
});

NoteSchema.index({ sourceId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
