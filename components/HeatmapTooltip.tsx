"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface HeatmapTooltipState {
  visible: boolean;
  text: string;
  x: number; // viewport coords
  y: number; // viewport coords
}

export default function HeatmapTooltip({ state }: { state: HeatmapTooltipState }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (!state.visible) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: state.y,
    left: state.x,
    transform: 'translate(-50%, -100%)',
    zIndex: 1000,
    pointerEvents: 'none',
  };

  return createPortal(
    <div style={style} className="px-2 py-1 rounded border border-border bg-white text-foreground dark:bg-slate-900 dark:text-slate-100 shadow-md will-change-transform">
      {state.text}
    </div>,
    document.body,
  );
}
