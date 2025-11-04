'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { RotateCw, Save, Plus } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import MindMapNode from './MindMapNode';
import CustomEdge from './CustomEdge';
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
    position?: { x: number; y: number };
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

const edgeTypes = {
  custom: CustomEdge,
};

export default function MindMapViewer({ videoId, nodes: initialNodes, edges: initialEdges }: MindMapViewerProps) {
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: ToastType }>>([]);

  // Toast functions - defined early so they can be used in callbacks
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

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
      position: node.position || { x: 0, y: 0 }, // Use saved position or default
    })),
    [initialNodes]
  );

  // Placeholder for delete handler (will be defined after hooks)
  const deleteEdgeRef = React.useRef<((edgeId: string) => void) | null>(null);

  const initialReactFlowEdges: Edge[] = useMemo(() =>
    initialEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'custom', // Changed from 'bezier' to 'custom' to use our CustomEdge component
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
      data: {
        onDelete: (edgeId: string) => deleteEdgeRef.current?.(edgeId), // Use ref to avoid hook ordering issue
      },
    })),
    [initialEdges]
  );

  // Apply layout only if no saved positions exist
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    const hasSavedPositions = initialNodes.some(node => node.position?.x !== undefined);

    if (hasSavedPositions) {
      // Use saved positions
      return {
        nodes: initialReactFlowNodes,
        edges: initialReactFlowEdges,
      };
    }

    // Otherwise, calculate layout with Dagre
    return getLayoutedElements(initialReactFlowNodes, initialReactFlowEdges, { direction: layoutDirection });
  }, [initialReactFlowNodes, initialReactFlowEdges, layoutDirection, initialNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Now define handleDeleteEdge AFTER setEdges is initialized
  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    showToast('Connection deleted', 'info');
  }, [setEdges, showToast]);

  // Update the ref with the actual handler
  deleteEdgeRef.current = handleDeleteEdge;

  const handleNodeDataChange = useCallback((nodeId: string, newData: Partial<{ label: string; type: string; description?: string; level: number }>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  }, [setNodes]);

  // Add onDataChange to nodes after initialization
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, onDataChange: handleNodeDataChange },
      }))
    );
  }, [setNodes, handleNodeDataChange]);

  // Re-layout when direction changes (only if no saved positions)
  useEffect(() => {
    const hasSavedPositions = initialNodes.some(node => node.position?.x !== undefined);
    if (!hasSavedPositions) {
      const { nodes: newNodes, edges: newEdges } = getLayoutedElements(initialReactFlowNodes, initialReactFlowEdges, { direction: layoutDirection });
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [layoutDirection, initialReactFlowNodes, initialReactFlowEdges, initialNodes, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'custom', // Use custom edge type for new connections
      animated: false,
      style: { stroke: 'var(--accent)', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent)' },
      data: { onDelete: handleDeleteEdge },
    }, eds)),
    [setEdges, handleDeleteEdge]
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

  const handleAddNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'mindMapNode',
      data: {
        label: 'New Node',
        type: 'detail',
        description: 'Click to edit',
        level: 3,
        onDataChange: handleNodeDataChange, // Add the callback so new nodes can be edited
      },
      position: { x: 250, y: 250 },
    };
    setNodes((nds) => [...nds, newNode]);
    showToast('New node added. Double-click to edit.', 'success');
  };

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
      <div className="h-[600px] bg-card-bg rounded-xl border border-border overflow-hidden relative">
        {/* Custom CSS for React Flow controls - dark mode friendly */}
        <style jsx global>{`
          .react-flow__controls {
            background: var(--card-bg) !important;
            border: 1px solid var(--border) !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          }

          .react-flow__controls-button {
            background: transparent !important;
            border-bottom: 1px solid var(--border) !important;
            color: var(--foreground) !important;
            transition: all 0.2s ease !important;
          }

          .react-flow__controls-button:last-child {
            border-bottom: none !important;
          }

          .react-flow__controls-button:hover {
            background: var(--accent) !important;
            color: white !important;
          }

          .react-flow__controls-button svg {
            fill: currentColor !important;
          }

          .react-flow__minimap {
            background: var(--card-bg) !important;
            border: 1px solid var(--border) !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          }

          .react-flow__minimap-mask {
            fill: rgba(0, 0, 0, 0.1) !important;
          }
        `}</style>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'custom',
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
            className="border border-border rounded-lg"
          />
        </ReactFlow>
      </div>

      {/* Instructions */}
      <div className="bg-muted/30 rounded-xl px-4 py-3 text-sm text-muted-foreground">
        <strong>Instructions:</strong> Drag nodes to reposition • Double-click nodes to edit • Click and drag between nodes to create connections •
        Hover over connections to delete them • Use mouse wheel to zoom • Drag canvas to pan
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}