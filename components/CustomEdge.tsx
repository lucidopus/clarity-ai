'use client';

import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface CustomEdgeData {
  onDelete?: (edgeId: string) => void;
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent, edgeId: string) => {
    evt.stopPropagation();
    const customData = data as CustomEdgeData;
    if (customData?.onDelete) {
      customData.onDelete(edgeId);
    }
  };

  return (
    <>
      {/* Base edge path with hover detection */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />

      {/* Invisible wider path for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      {/* Edge label and delete button */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex items-center gap-2"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Label */}
          {label && (
            <div
              className="bg-card-bg border border-border rounded-lg px-3 py-1 text-xs font-medium text-foreground shadow-sm"
              style={{ opacity: 0.95 }}
            >
              {label}
            </div>
          )}

          {/* Delete button - only show on hover */}
          {isHovered && (
            <button
              onClick={(event) => onEdgeClick(event, id)}
              className="flex items-center cursor-pointer justify-center w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all transform hover:scale-110"
              title="Delete connection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
