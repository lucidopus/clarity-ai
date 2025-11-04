import dagre from '@dagrejs/dagre';
import { Node, Edge, Position } from '@xyflow/react';

export interface LayoutOptions {
  direction?: 'TB' | 'LR'; // Top-to-Bottom or Left-to-Right
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSep?: number; // Horizontal separation
  rankSep?: number; // Vertical separation
}

// Get actual node dimensions based on type
function getNodeDimensions(nodeType: string): { width: number; height: number } {
  // These match the actual CSS classes in MindMapNode.tsx
  const dimensions = {
    root: { width: 240, height: 96 },       // w-60 h-24
    concept: { width: 208, height: 80 },    // w-52 h-20
    subconcept: { width: 192, height: 72 }, // w-48 h-18
    detail: { width: 176, height: 64 },     // w-44 h-16
  };
  return dimensions[nodeType as keyof typeof dimensions] || dimensions.detail;
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
) {
  const {
    direction = 'TB',
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';

  // Dynamic spacing based on direction
  // For TB (vertical): nodeSep = horizontal spacing, rankSep = vertical spacing
  // For LR (horizontal): nodeSep = vertical spacing, rankSep = horizontal spacing
  const nodeSep = isHorizontal ? 100 : 120;  // Vertical spacing for LR, horizontal for TB
  const rankSep = isHorizontal ? 200 : 180;  // Horizontal spacing for LR, vertical for TB

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    marginx: 100,
    marginy: 100,
    align: undefined,  // Let Dagre handle alignment automatically for better balance
    ranker: 'tight-tree',  // Use tight-tree ranker for more compact, balanced layouts
  });

  // Set node dimensions based on actual node type
  nodes.forEach((node) => {
    const nodeType = (node.data && typeof node.data === 'object' && 'type' in node.data && typeof node.data.type === 'string')
      ? node.data.type
      : 'detail';
    const { width, height } = getNodeDimensions(nodeType);
    dagreGraph.setNode(node.id, { width, height });
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
    const nodeType = (node.data && typeof node.data === 'object' && 'type' in node.data && typeof node.data.type === 'string')
      ? node.data.type
      : 'detail';
    const { width, height } = getNodeDimensions(nodeType);

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}