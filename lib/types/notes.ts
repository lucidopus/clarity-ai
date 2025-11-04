import mongoose from 'mongoose';

export interface ISegmentNote {
  segmentId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId: string;
  generalNote: string;
  segmentNotes: ISegmentNote[];
  createdAt: Date;
  updatedAt: Date;
}