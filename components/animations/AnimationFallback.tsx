'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  reason?: string;
}

export default function AnimationFallback({ title, description, reason }: Props) {
  return (
    <div className="my-3 rounded-lg border border-border/50 bg-muted/20 p-5">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <BarChart3 className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
          )}
          {description && (
            <p className="text-sm text-secondary leading-relaxed">{description}</p>
          )}
          {reason && (
            <p className="text-xs text-secondary/70 mt-2 italic">{reason}</p>
          )}
          {!description && !reason && (
            <p className="text-sm text-secondary">
              Animation could not be rendered. Your browser may not support WebGL.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
