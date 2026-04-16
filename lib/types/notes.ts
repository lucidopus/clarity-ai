import mongoose from 'mongoose';

export type PageConfidence = 'red' | 'yellow' | 'green';

export interface ISegmentNote {
  segmentId: string;
  content: string;
  confidence?: PageConfidence;
  createdAt: Date;
  updatedAt: Date;
}

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceId: string;
  generalNote: string;
  segmentNotes: ISegmentNote[];
  createdAt: Date;
  updatedAt: Date;
}
