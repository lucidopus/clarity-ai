'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface AnomalyBannerProps {
  title: string;
  detail: string;
  severity?: 'warning' | 'critical';
  onDismiss?: () => void;
  className?: string;
}

// Surfaces spending anomalies (e.g. today's cost > mean + 3σ) at the top of
// the Overview tab. Uses role="alert" so assistive tech announces the
// banner on render, and always pairs the color state with an icon + label
// to meet WCAG 1.4.1 (color is not the only signal).
export default function AnomalyBanner({
  title,
  detail,
  severity = 'warning',
  onDismiss,
  className = '',
}: AnomalyBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const critical = severity === 'critical';
  const border = critical ? 'border-red-500/50' : 'border-amber-500/50';
  const bg = critical ? 'bg-red-500/10' : 'bg-amber-500/10';
  const iconColor = critical ? 'text-red-500' : 'text-amber-500';
  const label = critical ? 'Critical' : 'Warning';

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border ${border} ${bg} ${className}`}
    >
      <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wide ${iconColor}`}>
            {label}
          </span>
          <span>·</span>
          <span>{title}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1">{detail}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        aria-label="Dismiss alert"
        className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
