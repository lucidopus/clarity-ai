'use client';

import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

interface RefreshControlProps {
  onRefresh: () => void;
  loading?: boolean;
  lastUpdated?: Date | null;
  className?: string;
}

// Refresh button + "updated N min ago" label. Cost data lives in an admin
// dashboard where staleness matters (costs only reconcile after the pipeline
// completes), so we surface freshness instead of hiding it behind a reload.
export default function RefreshControl({
  onRefresh,
  loading = false,
  lastUpdated,
  className = '',
}: RefreshControlProps) {
  // `tick` forces a re-render every 30s so the relative timestamp stays
  // accurate. The value itself is unused — we just need to invalidate.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const relative = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true })
    : null;

  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      {relative && (
        <span className="text-muted-foreground hidden sm:inline">
          Updated {relative}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        aria-label={loading ? 'Refreshing cost data' : 'Refresh cost data'}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-background/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        <span>Refresh</span>
      </button>
    </div>
  );
}
