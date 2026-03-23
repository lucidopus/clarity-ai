'use client';

import React, { useState, useMemo } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { isWebGLSupported } from '@/lib/utils/webgl-detect';
import type { AnimationSpec } from '@/lib/types/animation';
import AnimationFallback from './AnimationFallback';
import AnimationErrorBoundary from './AnimationErrorBoundary';

import {
  ShapeTransformTemplate,
  VectorAdditionTemplate,
  MatrixTransformTemplate,
  FunctionGraphTemplate,
  NumberLineTemplate,
  UnitCircleTemplate,
  DerivativeTangentTemplate,
  AreaUnderCurveTemplate,
} from './templates';

interface Props {
  spec: AnimationSpec;
}

export default function AnimationRenderer({ spec }: Props) {
  const [replayKey, setReplayKey] = useState(0);
  const [containerWidth, setContainerWidth] = useState(600);

  // Responsive sizing: use container width, cap height proportionally
  const width = Math.min(containerWidth, spec.config?.width ?? 600);
  const height = Math.round(width * (2 / 3));

  const webGLSupported = useMemo(() => isWebGLSupported(), []);

  if (!webGLSupported) {
    return (
      <AnimationFallback
        title={spec.title}
        description={spec.description}
      />
    );
  }

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
  };

  const renderTemplate = () => {
    switch (spec.type) {
      case 'shape_transform':
        return <ShapeTransformTemplate spec={spec} width={width} height={height} />;
      case 'vector_addition':
        return <VectorAdditionTemplate spec={spec} width={width} height={height} />;
      case 'matrix_transform':
        return <MatrixTransformTemplate spec={spec} width={width} height={height} />;
      case 'function_graph':
        return <FunctionGraphTemplate spec={spec} width={width} height={height} />;
      case 'number_line':
        return <NumberLineTemplate spec={spec} width={width} height={height} />;
      case 'unit_circle':
        return <UnitCircleTemplate spec={spec} width={width} height={height} />;
      case 'derivative_tangent':
        return <DerivativeTangentTemplate spec={spec} width={width} height={height} />;
      case 'area_under_curve':
        return <AreaUnderCurveTemplate spec={spec} width={width} height={height} />;
      default: {
        const unknownSpec = spec as { type: string; title?: string; description?: string };
        return (
          <AnimationFallback
            title={unknownSpec.title}
            description={unknownSpec.description}
            reason={`Unknown animation type: "${unknownSpec.type}"`}
          />
        );
      }
    }
  };

  return (
    <div
      className="my-3"
      ref={(el) => {
        if (el) {
          const w = el.getBoundingClientRect().width;
          if (w > 0 && Math.abs(w - containerWidth) > 10) {
            setContainerWidth(w);
          }
        }
      }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Play className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-medium text-foreground">{spec.title}</span>
        </div>
        <button
          onClick={handleReplay}
          className="flex items-center gap-1 text-xs text-secondary hover:text-accent transition-colors px-2 py-1 rounded hover:bg-accent/10 cursor-pointer"
          title="Replay animation"
        >
          <RotateCcw className="h-3 w-3" />
          Replay
        </button>
      </div>

      {/* Animation canvas */}
      <AnimationErrorBoundary title={spec.title} description={spec.description}>
        <div key={replayKey} className="rounded-lg overflow-hidden border border-border/30">
          {renderTemplate()}
        </div>
      </AnimationErrorBoundary>

      {/* Description */}
      {spec.description && (
        <p className="mt-1.5 text-xs text-secondary/80 italic">{spec.description}</p>
      )}
    </div>
  );
}
