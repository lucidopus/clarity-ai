'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';

interface MindMapNodeData {
  label: string;
  type: 'root' | 'concept' | 'subconcept' | 'detail';
  description?: string;
  level: number;
  onDataChange?: (id: string, newData: Partial<MindMapNodeData>) => void;
}

function MindMapNode({ data, selected, id }: NodeProps) {
  const { label, type, description, onDataChange } = data as unknown as MindMapNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);

  // Style variants based on node type - ALL nodes use bg-card-bg for consistency in dark mode
  const nodeStyles: Record<string, string> = {
    root: 'bg-accent text-white border-0 shadow-lg shadow-accent/30 w-60 h-24',
    concept: 'bg-card-bg text-foreground border-accent border-2 shadow-md w-52 h-20',
    subconcept: 'bg-card-bg text-foreground border-border border-2 shadow-sm w-48 h-18',
    detail: 'bg-card-bg text-foreground border-border border-1 shadow-sm w-44 h-16', // Changed from bg-background to bg-card-bg
  };

  const textStyles: Record<string, string> = {
    root: 'text-lg font-bold',
    concept: 'text-base font-semibold',
    subconcept: 'text-sm font-medium',
    detail: 'text-sm font-normal', // Changed from text-xs to text-sm for better readability
  };

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(label);
  }, [label]);

  const handleEditSubmit = useCallback(() => {
    if (onDataChange && editValue.trim() !== label) {
      onDataChange(id, { label: editValue.trim() });
    }
    setIsEditing(false);
  }, [onDataChange, editValue, label, id]);

  const handleEditCancel = useCallback(() => {
    setEditValue(label);
    setIsEditing(false);
  }, [label]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  }, [handleEditSubmit, handleEditCancel]);

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
        onDoubleClick={handleDoubleClick}
        title={description || label}
      >
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-center"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="line-clamp-2">{label}</div>
        )}
      </motion.div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-accent border-2 border-white" />
    </>
  );
}

export default memo(MindMapNode);