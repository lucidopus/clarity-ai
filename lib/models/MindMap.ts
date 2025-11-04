import mongoose, { Document, Schema } from 'mongoose';

export interface IMindMapNode {
  id: string;
  label: string;
  type: 'root' | 'concept' | 'subconcept' | 'detail';
  description?: string;
  level: number;
  position?: { x: number; y: number }; // User-customized position
}

export interface IMindMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: 'hierarchy' | 'relation' | 'dependency';
}

export interface IMindMap extends Document {
  _id: mongoose.Types.ObjectId;
  videoId: string; // YouTube video ID
  userId: mongoose.Types.ObjectId;
  nodes: IMindMapNode[];
  edges: IMindMapEdge[];
  metadata: {
    generatedBy: string; // 'ai' or 'user-modified'
    generatedAt: Date;
    lastModifiedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MindMapNodeSchema: Schema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, required: true, enum: ['root', 'concept', 'subconcept', 'detail'] },
  description: { type: String },
  level: { type: Number, required: true },
  position: {
    x: { type: Number },
    y: { type: Number },
  },
}, { _id: false });

const MindMapEdgeSchema: Schema = new Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  label: { type: String },
  type: { type: String, required: true, enum: ['hierarchy', 'relation', 'dependency'] },
}, { _id: false });

const MindMapSchema: Schema = new Schema({
  videoId: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  nodes: [MindMapNodeSchema],
  edges: [MindMapEdgeSchema],
  metadata: {
    generatedBy: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    lastModifiedAt: { type: Date },
  },
}, {
  timestamps: true,
  collection: 'mindmaps',
});

// Unique index per user per video
MindMapSchema.index({ videoId: 1, userId: 1 }, { unique: true });

export default mongoose.models.MindMap || mongoose.model<IMindMap>('MindMap', MindMapSchema);