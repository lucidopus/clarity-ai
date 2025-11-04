# Feature: Interactive Mind Map Visualization for Educational Videos

## Overview

Implement an AI-generated, interactive mind map visualization feature that displays hierarchical concept relationships from educational video content. Mind maps will be automatically generated during video processing using LLM function calling and displayed as an interactive, editable graph visualization using React Flow with Dagre layout algorithm.

## Problem Statement

Students watching educational videos need a visual way to understand the hierarchical structure and relationships between concepts. A mind map provides:
- **Visual Overview**: Quick grasp of main topics and their connections
- **Cognitive Anchoring**: Better memory retention through visual spatial organization
- **Navigation**: Easy understanding of prerequisite relationships and topic flow
- **Customization**: Ability to personalize the map by adding their own insights

## Goals

1. **Automatic Generation**: LLM creates mind map structure during video processing (Phase 5 pipeline)
2. **Beautiful Visualization**: Dark/light mode support, smooth animations, premium design
3. **Full Interactivity**: Pan, zoom, click nodes for details, fits-to-view
4. **User Editing**: Add new nodes, edit existing nodes, delete connections, create new connections
5. **Persistence**: Mind maps saved to MongoDB and quickly retrieved

## Reference Design

See screenshot: `/var/folders/35/mgsm_95977708n4_hnxgwmfr0000gn/T/TemporaryItems/NSIRD_screencaptureui_6HI69Q/Screenshot 2025-11-03 at 11.03.18 PM.png`

Key visual elements:
- Dark background with vibrant node colors
- Hierarchical tree layout (top-to-bottom)
- Smooth curved edges connecting nodes
- Clean, minimal design
- Animated node transitions

---

## Technical Specifications

### Technology Stack

- **Visualization**: React Flow (`@xyflow/react` v12+)
- **Layout Algorithm**: Dagre (`@dagrejs/dagre`)
- **Animations**: Framer Motion (already in project)
- **Icons**: Lucide React (Network icon for tab)
- **Database**: MongoDB (new `mindmaps` collection)
- **LLM**: Groq with structured outputs (existing pipeline)

### Dependencies to Install

```bash
npm install @xyflow/react @dagrejs/dagre
npm install --save-dev @types/dagre
```

---

## Implementation Plan

### Phase 1: Database Schema & Models

#### 1.1 Create MindMap MongoDB Schema

**New File: `/lib/models/MindMap.ts`**

```typescript
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
  type: { type: String, required: true, enum: ['hierarchy', 'relation', 'dependency'] }, // FIXED: Added type field
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
```

**Action Items:**
- [ ] Create `/lib/models/MindMap.ts` with schema above
- [ ] Export MindMap model in `/lib/models/index.ts`

---

### Phase 2: LLM Integration

#### 2.1 Extend Structured Output Schema

**File: `/lib/structuredOutput.ts`**

Add to `LEARNING_MATERIALS_SCHEMA`:

```typescript
mindMap: {
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          type: { type: 'string', enum: ['root', 'concept', 'subconcept', 'detail'] },
          description: { type: 'string' },
          level: { type: 'integer' },
        },
        required: ['id', 'label', 'type', 'level'],
        additionalProperties: false,
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' },
          label: { type: 'string' },
          type: { type: 'string', enum: ['hierarchy', 'relation', 'dependency'] },
        },
        required: ['id', 'source', 'target', 'type'],
        additionalProperties: false,
      },
    },
  },
  required: ['nodes', 'edges'],
  additionalProperties: false,
}
```

Add to `LearningMaterials` TypeScript interface:

```typescript
mindMap: {
  nodes: Array<{
    id: string;
    label: string;
    type: 'root' | 'concept' | 'subconcept' | 'detail';
    description?: string;
    level: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'hierarchy' | 'relation' | 'dependency';
  }>;
};
```

**Action Items:**
- [ ] Update `LEARNING_MATERIALS_SCHEMA` in `/lib/structuredOutput.ts`
- [ ] Update `LearningMaterials` interface
- [ ] Add `mindMap` to `required` array in schema

#### 2.2 Update LLM Prompt

**File: `/lib/prompts.ts`**

Add to `LEARNING_MATERIALS_PROMPT`:

```typescript
export const LEARNING_MATERIALS_PROMPT = `You are an educational expert creating comprehensive study materials from a video transcript.

Generate 6 learning components based on this transcript:

## Instructions:
1. Generate a very short, relevant title for the video
2. Extract 5-8 key flashcards (important concepts)
3. Create 4-5 quiz questions (multiple choice)
4. Identify 3-5 key moments (timestamps + summaries)
5. List 2-3 prerequisite topics needed
6. Summarize context for an AI tutor
7. **Generate a hierarchical mind map showing concept relationships**

## Mind Map Requirements:
- Create a hierarchical structure with ONE root node (the main video topic)
- Generate a concept map proportional to the content's density and complexity
  - For a typical 10-15 minute video, this might be 10-15 nodes
  - For shorter content (5 min), use fewer nodes (6-10)
  - For longer, complex content (20+ min), more nodes are acceptable (15-25)
  - Prioritize clarity and comprehension over hitting a specific node count
- Each node should represent a distinct concept, subtopic, or key detail
- Node types:
  - **root** (level 0): Main topic of the video (only ONE)
  - **concept** (level 1): Major themes/sections (3-6 nodes)
  - **subconcept** (level 2): Supporting ideas under concepts (varies)
  - **detail** (level 3): Specific facts or examples (varies)
- Edges should represent relationships:
  - **hierarchy**: Parent-child relationships (main structure)
  - **relation**: Cross-topic connections (e.g., "relates to", "builds on")
  - **dependency**: Prerequisites (e.g., "requires understanding of")
- Add brief descriptions to important nodes for context
- Label edges with relationship types when meaningful (e.g., "leads to", "example of", "requires")
- Ensure the graph is connected (no isolated nodes)
- Prioritize clarity over completeness - don't overwhelm with too many nodes

## Requirements:
- Title: Concise, descriptive, and engaging (based on the main topic)
- Flashcards: Simple, testable, foundational concepts with clear questions and answers
- Quizzes: Variety (multiple choice), medium difficulty, 4 options per question
- Timestamps: Specific time codes from the video with topic summaries
- Prerequisites: Real knowledge gaps needed to understand this content, not obvious basics
- Context: Rich summary suitable for follow-up questions by an AI tutor
- Mind Map: Clear hierarchical structure showing how concepts connect

## Transcript:
[TRANSCRIPT_HERE]

Return a JSON object with the exact structure specified in the schema.`;
```

**Action Items:**
- [ ] Update `LEARNING_MATERIALS_PROMPT` in `/lib/prompts.ts`
- [ ] Test prompt with sample transcript to verify mind map quality
- [ ] No changes needed to `/lib/llm.ts` (already handles schema automatically)

---

### Phase 3: Video Processing Pipeline Integration

#### 3.1 Update Video Processing to Save Mind Map

**File: `/app/api/videos/process/route.ts`**

After saving flashcards and quizzes, add mind map saving logic:

```typescript
// Save mind map to database
console.log('💾 [PIPELINE] Saving mind map...');
const mindMapDoc = new MindMap({
  videoId: videoId,
  userId: user._id,
  nodes: materials.mindMap.nodes,
  edges: materials.mindMap.edges,
  metadata: {
    generatedBy: 'ai',
    generatedAt: new Date(),
  },
});
await mindMapDoc.save();
console.log(`✅ [PIPELINE] Mind map saved with ${materials.mindMap.nodes.length} nodes and ${materials.mindMap.edges.length} edges`);
```

**Action Items:**
- [ ] Import `MindMap` model in `/app/api/videos/process/route.ts`
- [ ] Add mind map saving logic after quizzes are saved
- [ ] Add error handling for mind map save failures
- [ ] Update success response to include mind map node/edge count

#### 3.2 Update Materials Retrieval API

**File: `/app/api/videos/[videoId]/materials/route.ts`**

Add mind map to fetched materials:

```typescript
// Fetch mind map
const mindMap = await MindMap.findOne({ videoId: videoId, userId: user._id });

// ... existing code ...

return NextResponse.json({
  video: videoData,
  flashcards: flashcardsData,
  quizzes: quizzesData,
  transcript: transcriptSegments,
  prerequisites: learningMaterial.prerequisites,
  prerequisiteQuiz: prerequisiteQuizData,
  mindMap: mindMap ? {
    nodes: mindMap.nodes,
    edges: mindMap.edges,
  } : {
    nodes: [],
    edges: [],
  },
});
```

**Action Items:**
- [ ] Import `MindMap` model in `/app/api/videos/[videoId]/materials/route.ts`
- [ ] Fetch mind map data
- [ ] Add mind map to response object with fallback for missing data
- [ ] Update TypeScript types to include mindMap field

---

### Phase 4: Mind Map Editing API

#### 4.1 Create Mind Map Update Endpoint

**New File: `/app/api/mindmaps/update/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { MindMap } from '@/lib/models';

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, nodes, edges } = body;

    if (!videoId || !nodes || !edges) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update mind map
    const mindMap = await MindMap.findOneAndUpdate(
      { videoId: videoId, userId: user._id },
      {
        nodes: nodes,
        edges: edges,
        'metadata.generatedBy': 'user-modified',
        'metadata.lastModifiedAt': new Date(),
      },
      { new: true }
    );

    if (!mindMap) {
      return NextResponse.json({ error: 'Mind map not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      mindMap: {
        nodes: mindMap.nodes,
        edges: mindMap.edges,
      },
    });
  } catch (error) {
    console.error('Error updating mind map:', error);
    return NextResponse.json({ error: 'Failed to update mind map' }, { status: 500 });
  }
}
```

**Action Items:**
- [ ] Create `/app/api/mindmaps/update/route.ts`
- [ ] Implement authentication check
- [ ] Implement update logic with validation
- [ ] Add error handling for invalid node/edge structures
- [ ] Test with various update scenarios (add node, delete edge, edit node)

---

### Phase 5: Layout Algorithm Utility

#### 5.1 Create Dagre Layout Helper

**New File: `/lib/mindMapLayout.ts`**

```typescript
import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  direction?: 'TB' | 'LR'; // Top-to-Bottom or Left-to-Right
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSep?: number; // Horizontal separation
  rankSep?: number; // Vertical separation
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
) {
  const {
    direction = 'TB',
    nodeWidth = 200,
    nodeHeight = 80,
    nodeSep = 60,
    rankSep = 120,
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    marginx: 50,
    marginy: 50,
  });

  // Set node dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Set edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Map positions back to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
```

**Action Items:**
- [ ] Create `/lib/mindMapLayout.ts`
- [ ] Test layout algorithm with sample graph data
- [ ] Verify it handles various graph structures (deep trees, wide graphs, etc.)

---

### Phase 6: Custom Node Components

#### 6.1 Create Reusable Node Components

**New File: `/components/MindMapNode.tsx`**

```typescript
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';

interface MindMapNodeData {
  label: string;
  type: 'root' | 'concept' | 'subconcept' | 'detail';
  description?: string;
  level: number;
}

function MindMapNode({ data, selected }: NodeProps<MindMapNodeData>) {
  const { label, type, description } = data;

  // Style variants based on node type
  const nodeStyles = {
    root: 'bg-accent text-white border-accent shadow-lg shadow-accent/30 w-60 h-24',
    concept: 'bg-card-bg text-foreground border-accent border-2 shadow-md w-52 h-20',
    subconcept: 'bg-card-bg text-foreground border-border border-2 shadow-sm w-48 h-18',
    detail: 'bg-background text-muted-foreground border-border shadow-sm w-44 h-16',
  };

  const textStyles = {
    root: 'text-lg font-bold',
    concept: 'text-base font-semibold',
    subconcept: 'text-sm font-medium',
    detail: 'text-xs font-normal',
  };

  return (
    <>
      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-accent border-2 border-white" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          ${nodeStyles[type]}
          ${textStyles[type]}
          rounded-xl px-4 py-3 flex items-center justify-center text-center
          transition-all duration-200 cursor-pointer
          ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-background scale-105' : 'hover:scale-105'}
        `}
        title={description || label}
      >
        <div className="line-clamp-2">{label}</div>
      </motion.div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-accent border-2 border-white" />
    </>
  );
}

export default memo(MindMapNode);
```

**Node Editing Implementation:**
- Double-click on node → show inline text input for label
- Add "Edit" button in tooltip/context menu
- Modal/popover for editing both label and description
- Save changes on blur or Enter key
- Cancel on Escape key

**Action Items:**
- [ ] Create `/components/MindMapNode.tsx`
- [ ] Design node styles for all 4 types (root, concept, subconcept, detail)
- [ ] Add hover effects and selection states
- [ ] Implement tooltip for description on hover
- [ ] **CRITICAL: Add double-click handler to enable node content editing**
- [ ] Test dark/light mode appearance

---

### Phase 7: Mind Map Viewer Component

#### 7.1 Create Main Visualization Component

**New File: `/components/MindMapViewer.tsx`**

```typescript
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, RotateCw, Save, Plus, Trash2 } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import MindMapNode from './MindMapNode';
import Button from './Button';
import { getLayoutedElements } from '@/lib/mindMapLayout';
import { ToastContainer, type ToastType } from './Toast';

interface MindMapViewerProps {
  videoId: string;
  nodes: Array<{
    id: string;
    label: string;
    type: 'root' | 'concept' | 'subconcept' | 'detail';
    description?: string;
    level: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'hierarchy' | 'relation' | 'dependency';
  }>;
}

const nodeTypes = {
  mindMapNode: MindMapNode,
};

export default function MindMapViewer({ videoId, nodes: initialNodes, edges: initialEdges }: MindMapViewerProps) {
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: ToastType }>>([]);

  // Convert to React Flow format
  const initialReactFlowNodes: Node[] = useMemo(() =>
    initialNodes.map((node) => ({
      id: node.id,
      type: 'mindMapNode',
      data: {
        label: node.label,
        type: node.type,
        description: node.description,
        level: node.level,
      },
      position: { x: 0, y: 0 }, // Will be set by layout
    })),
    [initialNodes]
  );

  const initialReactFlowEdges: Edge[] = useMemo(() =>
    initialEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep',
      animated: edge.type === 'relation',
      style: {
        stroke: edge.type === 'hierarchy' ? 'var(--accent)' :
                edge.type === 'relation' ? 'var(--muted-foreground)' :
                'var(--border)',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.type === 'hierarchy' ? 'var(--accent)' : 'var(--muted-foreground)',
      },
    })),
    [initialEdges]
  );

  // Apply layout - IMPORTANT: Check if user has saved custom positions
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    // If any nodes have saved positions, use those instead of Dagre layout
    const hasSavedPositions = initialNodes.some(node => node.position?.x !== undefined);

    if (hasSavedPositions) {
      // Use saved positions
      return {
        nodes: initialReactFlowNodes.map(node => {
          const savedNode = initialNodes.find(n => n.id === node.id);
          return {
            ...node,
            position: savedNode?.position || { x: 0, y: 0 },
          };
        }),
        edges: initialReactFlowEdges,
      };
    }

    // Otherwise, calculate layout with Dagre
    return getLayoutedElements(initialReactFlowNodes, initialReactFlowEdges, { direction: layoutDirection });
  }, [initialReactFlowNodes, initialReactFlowEdges, layoutDirection, initialNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Re-layout when direction changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = getLayoutedElements(nodes, edges, { direction: layoutDirection });
    setNodes(newNodes);
    setEdges(newEdges);
  }, [layoutDirection]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: false,
      style: { stroke: 'var(--accent)', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent)' },
    }, eds)),
    [setEdges]
  );

  const handleRelayout = () => {
    setLayoutDirection((prev) => (prev === 'TB' ? 'LR' : 'TB'));
    showToast(`Layout changed to ${layoutDirection === 'TB' ? 'horizontal' : 'vertical'}`, 'info');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/mindmaps/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoId,
          nodes: nodes.map((node) => ({
            id: node.id,
            label: node.data.label,
            type: node.data.type,
            description: node.data.description,
            level: node.data.level,
            position: node.position,
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label || '',
            type: edge.animated ? 'relation' : 'hierarchy',
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to save mind map');

      showToast('Mind map saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving mind map:', error);
      showToast('Failed to save mind map. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      showToast('Connection deleted', 'info');
    },
    [setEdges]
  );

  const handleAddNode = () => {
    // Simple implementation: add node at center
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'mindMapNode',
      data: {
        label: 'New Node',
        type: 'detail',
        description: 'Click to edit',
        level: 3,
      },
      position: { x: 250, y: 250 },
    };
    setNodes((nds) => [...nds, newNode]);
    showToast('New node added. Drag to position it.', 'success');
  };

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      showToast('Node deleted', 'info');
    },
    [setNodes, setEdges]
  );

  // Empty state
  if (initialNodes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center h-96 bg-card-bg rounded-xl border border-border"
      >
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Mind Map Available</h3>
          <p className="text-muted-foreground">The mind map could not be generated for this video.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex items-center justify-between bg-card-bg border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRelayout}
            className="flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            Re-layout
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddNode}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Node
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {nodes.length} nodes • {edges.length} connections
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="h-[600px] bg-card-bg rounded-xl border border-border overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              switch (node.data.type) {
                case 'root': return 'var(--accent)';
                case 'concept': return 'var(--accent-light)';
                case 'subconcept': return 'var(--muted)';
                case 'detail': return 'var(--border)';
                default: return 'var(--muted)';
              }
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
            className="bg-background border border-border rounded-lg"
          />
        </ReactFlow>
      </div>

      {/* Instructions */}
      <div className="bg-muted/30 rounded-xl px-4 py-3 text-sm text-muted-foreground">
        <strong>Instructions:</strong> Drag nodes to reposition • Click and drag between nodes to create connections •
        Click connections to select and delete • Use mouse wheel to zoom • Drag canvas to pan
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
```

**Action Items:**
- [ ] Create `/components/MindMapViewer.tsx`
- [ ] Implement all interactive features (zoom, pan, node dragging)
- [ ] **CRITICAL: Preserve user-saved positions on reload (check for saved positions before applying Dagre)**
- [ ] **Add "Reset Layout" button to re-run Dagre algorithm if user wants to restore auto-layout**
- [ ] Add save functionality with API integration
- [ ] Implement add/delete node/edge capabilities
- [ ] **Implement node content editing (double-click or edit button)**
- [ ] Add mini-map for navigation
- [ ] Add empty state handling
- [ ] Test on different screen sizes
- [ ] Verify dark/light mode support

---

### Phase 8: Integrate into Materials View

#### 8.1 Add Mind Map Tab

**File: `/app/generations/[videoId]/page.tsx`**

1. Add Network icon import:
```typescript
import { BookOpen, Brain, CheckCircle2, Video, LogOut, Plus, Network } from 'lucide-react';
```

2. Update tab type:
```typescript
type TabType = 'flashcards' | 'quizzes' | 'transcript' | 'prerequisites' | 'mindmap';
```

3. Add to tabs array:
```typescript
const tabs = [
  { id: 'transcript' as TabType, label: 'Learn', icon: Video },
  { id: 'prerequisites' as TabType, label: 'Prerequisites', icon: CheckCircle2 },
  { id: 'flashcards' as TabType, label: 'Flashcards', icon: BookOpen },
  { id: 'quizzes' as TabType, label: 'Quizzes', icon: Brain },
  { id: 'mindmap' as TabType, label: 'Mind Map', icon: Network },
];
```

4. Add mind map to materials interface:
```typescript
mindMap: {
  nodes: Array<{
    id: string;
    label: string;
    type: 'root' | 'concept' | 'subconcept' | 'detail';
    description?: string;
    level: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'hierarchy' | 'relation' | 'dependency';
  }>;
};
```

5. Add tab content:
```typescript
{activeTab === 'mindmap' && (
  <MindMapViewer
    videoId={videoId}
    nodes={materials.mindMap.nodes}
    edges={materials.mindMap.edges}
  />
)}
```

**Action Items:**
- [ ] Import `Network` icon and `MindMapViewer` component
- [ ] Update `TabType` to include 'mindmap'
- [ ] Add mind map tab to tabs array
- [ ] Update `VideoMaterials` interface
- [ ] Add mind map rendering in tab content
- [ ] Test tab switching and data loading

---

## Acceptance Criteria

### Functional Requirements

- [ ] **LLM Generation**: Mind maps are automatically generated during video processing with reasonable node count (8-20 nodes)
- [ ] **Visualization**: Mind maps display with hierarchical layout (Dagre algorithm)
- [ ] **Interactivity**:
  - [ ] Pan and zoom the canvas
  - [ ] Click nodes to see descriptions (tooltip)
  - [ ] Double-click nodes to edit content (label and description)
  - [ ] Drag nodes to reposition
  - [ ] Create connections between nodes
  - [ ] Delete connections
  - [ ] Add new nodes
  - [ ] Delete nodes
- [ ] **Persistence**:
  - [ ] Mind maps save to MongoDB during video processing
  - [ ] User edits save via API endpoint
  - [ ] Changes persist across sessions
- [ ] **Integration**: Mind Map tab appears in materials view with Network icon

### Design Requirements

- [ ] **Visual Design**:
  - [ ] Matches design principles (minimal, clean, ample whitespace)
  - [ ] Node styling differentiates between types (root, concept, subconcept, detail)
  - [ ] Accent color used for root nodes and primary connections
  - [ ] Smooth animations (<300ms) for node entrance
  - [ ] Professional, polished appearance

- [ ] **Dark/Light Mode**:
  - [ ] Both themes look equally polished
  - [ ] Text contrast meets WCAG AA (4.5:1 minimum)
  - [ ] Node backgrounds adapt to theme
  - [ ] Edge colors visible in both modes

- [ ] **Responsive Design**:
  - [ ] Works on desktop (1920px+)
  - [ ] Works on tablet (768px-1024px)
  - [ ] Works on mobile (375px-767px)
  - [ ] Touch gestures work on mobile (pan, zoom, drag)

- [ ] **Accessibility**:
  - [ ] Keyboard navigation works (Tab, Arrow keys)
  - [ ] Focus states visible on all interactive elements
  - [ ] ARIA labels on buttons and controls
  - [ ] Screen reader compatible

### Technical Requirements

- [ ] **Performance**:
  - [ ] Layout calculation completes in <500ms for graphs up to 30 nodes
  - [ ] Smooth 60fps animations
  - [ ] No memory leaks during extended use

- [ ] **Error Handling**:
  - [ ] Graceful fallback if mind map generation fails
  - [ ] Empty state displayed if no mind map available
  - [ ] Error messages on save failures
  - [ ] Validation for invalid node/edge structures

- [ ] **Code Quality**:
  - [ ] TypeScript types for all data structures
  - [ ] Component props properly typed
  - [ ] No ESLint errors
  - [ ] Code follows existing project conventions
  - [ ] Comments for complex logic

---

## Testing Checklist

### Unit Testing

- [ ] Test layout algorithm with various graph structures (linear, branching, cyclic)
- [ ] Test node positioning calculations
- [ ] Test edge connection logic
- [ ] Test save/load operations

### Integration Testing

- [ ] Test full video processing pipeline with mind map generation
- [ ] Test materials API returns mind map data
- [ ] Test mind map update API with valid/invalid data
- [ ] Test authentication on mind map endpoints

### User Acceptance Testing

- [ ] Process 3-5 different educational videos and verify mind map quality
- [ ] Test all user interactions (add, edit, delete nodes/edges)
- [ ] Verify save functionality persists changes
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on iOS and Android mobile devices
- [ ] Get feedback from 2-3 beta users

### Visual Regression Testing

- [ ] Compare light mode screenshot to design principles
- [ ] Compare dark mode screenshot to design principles
- [ ] Verify consistency across different browsers
- [ ] Check hover states and animations

---

## Dependencies

### External Libraries

```json
{
  "@xyflow/react": "^12.0.0",
  "@dagrejs/dagre": "^1.1.4"
}
```

### Dev Dependencies

```json
{
  "@types/dagre": "^0.7.52"
}
```

### Existing Dependencies (No Changes)

- `framer-motion`: Animations
- `lucide-react`: Icons
- `mongoose`: Database
- `groq-sdk`: LLM
- `next`: Framework
- `tailwindcss`: Styling

---

## Documentation Updates Needed

- [ ] Update `/docs/PHASE_TRACKER.md` to mark Phase 5 complete once mind map is done
- [ ] Add mind map feature to project README
- [ ] Document mind map schema in database documentation
- [ ] Add mind map editing instructions to user guide (if exists)

---

## Timeline Estimate

| Task | Estimated Time |
|------|----------------|
| Database schema & models | 1 hour |
| LLM integration (schema + prompt) | 1 hour |
| Video pipeline integration | 1 hour |
| Mind map update API | 1 hour |
| Layout algorithm | 1 hour |
| Custom node components | 2 hours |
| Mind map viewer component | 4 hours |
| Materials view integration | 1 hour |
| Testing & bug fixes | 3 hours |
| Design polish & accessibility | 2 hours |
| **Total** | **17-20 hours (~2-3 days)** |

---

## Risks & Mitigation

### Risk 1: LLM Generates Poor Quality Mind Maps

**Mitigation**:
- Provide clear examples in prompt
- Add validation to ensure graph is connected
- Test with 5+ different video types
- Iterate on prompt based on results

### Risk 2: Performance Issues with Large Graphs

**Mitigation**:
- Prompt guides LLM to reasonable node count
- Implement virtualization if needed
- Test with graphs up to 30 nodes
- Add loading states for layout calculations

### Risk 3: Complex Editing UX

**Mitigation**:
- Keep editing simple (drag, click to connect, click to delete)
- Provide clear instructions
- Add undo/redo if time permits
- User testing before launch

### Risk 4: Dark Mode Edge Visibility

**Mitigation**:
- Test edge colors in both themes
- Use high contrast colors
- Add edge labels for clarity
- Get design feedback early

---

## Future Enhancements (Post-MVP)

These features are out of scope for this task but could be added later:

- [ ] Export mind map as PNG/SVG
- [ ] Collaborative editing (multiple users)
- [ ] Mind map templates
- [ ] AI-assisted node suggestions
- [ ] Search within mind map
- [ ] Filter by node type
- [ ] Undo/redo functionality
- [ ] Custom color schemes per node
- [ ] Notes attached to nodes
- [ ] Link nodes to video timestamps

---

## Senior Engineering Manager (SEM) Review & Considerations

This implementation plan was reviewed by the Senior Engineering Manager. The following critical issues were identified and **fixed in this plan**:

### ✅ Fixed Critical Issues

1. **Database Schema Bug**: Added `type` field to `MindMapEdgeSchema` Mongoose definition (was missing, would cause runtime error)
2. **LLM Prompt Improvement**: Changed from rigid "8-20 nodes" to proportional node count based on content density
3. **Missing Feature**: Added node content editing capability (double-click to edit label and description)
4. **Performance Bug**: Fixed layout logic to preserve user-saved custom positions on reload (was overwriting with Dagre layout every time)

### 📋 Additional Considerations (Future Enhancements)

These are valid architectural suggestions from the SEM that are **out of scope for MVP** but should be considered for future iterations:

**API Design Enhancement:**
- Current approach: Full array replacement for mind map updates (simple but potentially inefficient)
- Future improvement: Action-based API (`POST /api/mindmaps/actions` with `{ action: 'ADD_NODE', payload: {...} }`)
- Benefits: More granular, easier to debug, supports undo/redo, better for real-time collaboration
- Trade-off: More complex to implement, may be overkill for single-user editing

**Mobile UX Enhancement:**
- Current approach: Standard click-and-drag interactions
- Future improvement: Dedicated "connect mode" for touchscreens (tap two nodes to create edge)
- Benefits: Better mobile experience, less accidental connections
- Trade-off: Requires additional UI state and mode switching

**Accessibility Enhancement:**
- Current approach: ARIA labels on interactive elements
- Future improvement: Proper screen reader announcements for edge relationships (e.g., "Node A leads to Node B")
- Benefits: Better accessibility for screen reader users
- Trade-off: SVG accessibility is non-trivial, requires specialized implementation

**Data Validation Enhancement:**
- Current approach: Trust LLM to generate valid hierarchical graphs
- Future improvement: Detect and break cyclical dependencies in graph validation
- Benefits: Ensures clean hierarchical layout even if LLM makes mistakes
- Trade-off: Additional complexity, may not be needed if LLM is reliable

**SEM Recommendation**: Address the fixed issues in initial implementation. Revisit future enhancements after gathering user feedback and usage patterns.

---

**Codebase Files:**
- `/lib/models/` - Database models
- `/lib/structuredOutput.ts` - LLM schemas
- `/lib/prompts.ts` - LLM prompts
- `/lib/llm.ts` - LLM generation logic
- `/components/` - React components
- `/app/generations/[videoId]/page.tsx` - Materials view
- `/app/api/videos/process/route.ts` - Video processing pipeline
- `/app/api/videos/[videoId]/materials/route.ts` - Materials API

**Documentation:**
- `/docs/phases/PHASE_5_VIDEO_PIPELINE.md` - Phase 5 specifications
- `/docs/context/design-principles.md` - Design guidelines
- `/docs/PHASE_TRACKER.md` - Progress tracking

**External Documentation:**
- React Flow: https://reactflow.dev/api-reference
- Dagre Layout: https://reactflow.dev/examples/layout/dagre
- Groq Structured Outputs: https://console.groq.com/docs/structured-outputs
- Framer Motion: https://www.framer.com/motion/

---

## Success Metrics

**Quantitative:**
- Mind map generation success rate: >95% of videos
- Layout calculation time: <500ms
- User saves per session: 2-3 edits on average
- Zero critical bugs in production after 1 week

**Qualitative:**
- Users find mind maps helpful for understanding video content
- Mind maps look professional and polished
- Editing experience feels intuitive
- Dark mode is as beautiful as light mode

---

## Notes for Reviewers

1. **Design First**: Before coding, review the screenshot and design-principles.md to understand the visual target
2. **Test Early**: Test LLM mind map generation with 3 sample videos before building UI
3. **Incremental**: Build in phases (LLM → Database → Viewer → Editing) rather than all at once
4. **Get Feedback**: Show work-in-progress to team/users for early feedback
5. **Accessibility**: Don't treat accessibility as an afterthought - build it in from the start

---

## Questions & Clarifications

If you have questions while implementing, consider:

1. **Mind map quality issues?** → Iterate on LLM prompt with specific examples
2. **Performance problems?** → Profile with React DevTools, optimize layout calculations
3. **Design doesn't match?** → Reference design-principles.md strictly
4. **Unsure about UX?** → Ask for user feedback with prototype
5. **Stuck on technical issue?** → Consult SEM via `gemini -p` command

---

## Final Checklist Before Submitting PR

- [ ] All acceptance criteria met
- [ ] Code passes ESLint with no errors
- [ ] TypeScript compiles with no errors
- [ ] All components have proper TypeScript types
- [ ] Dark mode tested and looks polished
- [ ] Tested on Chrome, Firefox, Safari
- [ ] Tested on mobile device
- [ ] Accessibility verified (keyboard nav, screen reader)
- [ ] No console errors in browser
- [ ] Database migrations run successfully
- [ ] API endpoints return correct data
- [ ] User can complete full workflow (process video → view mind map → edit → save)
- [ ] Performance is acceptable (<500ms layout, 60fps animations)
- [ ] Documentation updated (if needed)
- [ ] Screenshots added to PR for visual review

---

**Priority**: High (Part of Phase 5 - Core MVP)
**Complexity**: Medium (New feature but follows existing patterns)
**Estimated Effort**: 2-3 days (17-20 hours)
