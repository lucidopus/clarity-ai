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
    align: undefined, // Let the ranker handle alignment for a more balanced layout
    ranker: 'tight-tree', // Use longest-path for both horizontal and vertical for a more balanced layout
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

  // Manually center the root node based on its immediate children
  const rootNode = nodes.find(n => n.data.type === 'root');
  if (rootNode) {
    const childEdges = edges.filter(e => e.source === rootNode.id);
    const childNodeIds = childEdges.map(e => e.target);
    const childNodesFromGraph = childNodeIds.map(id => dagreGraph.node(id)).filter(Boolean); // Filter out undefined nodes

    if (childNodesFromGraph.length > 0) {
      const rootNodeWithPosition = dagreGraph.node(rootNode.id);

      if (isHorizontal) { // For LR layout, average the y-positions of children
        const yPositions = childNodesFromGraph.map(n => n.y);
        const avgY = yPositions.reduce((acc, y) => acc + y, 0) / yPositions.length;
        rootNodeWithPosition.y = avgY;
      } else { // For TB layout, average the x-positions of children
        const xPositions = childNodesFromGraph.map(n => n.x);
        const avgX = xPositions.reduce((acc, x) => acc + x, 0) / xPositions.length;
        rootNodeWithPosition.x = avgX;
      }
    }
  }

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