'use client';

interface CostSkeletonProps {
  className?: string;
  rows?: number;
  variant?: 'card' | 'chart' | 'table';
}

// Shared skeleton loader for cost widgets. Replaces the scattered spinner
// implementations across cost components. Uses `aria-busy` so screen
// readers announce the loading state instead of announcing the empty DOM.
export default function CostSkeleton({
  className = '',
  rows = 3,
  variant = 'card',
}: CostSkeletonProps) {
  const shimmer = 'relative overflow-hidden bg-secondary/20 rounded';
  const shimmerBar = `${shimmer} before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent`;

  if (variant === 'chart') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading chart"
        className={`bg-card-bg border border-border rounded-xl p-6 ${className}`}
      >
        <div className={`${shimmerBar} h-5 w-40 mb-6`} />
        <div className={`${shimmerBar} h-[300px] w-full`} />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading table"
        className={`bg-card-bg border border-border rounded-xl p-6 ${className}`}
      >
        <div className={`${shimmerBar} h-5 w-48 mb-6`} />
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className={`${shimmerBar} h-12 w-full`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={`bg-card-bg border border-border rounded-xl p-6 ${className}`}
    >
      <div className={`${shimmerBar} h-4 w-24 mb-3`} />
      <div className={`${shimmerBar} h-8 w-32 mb-2`} />
      <div className={`${shimmerBar} h-3 w-40`} />
    </div>
  );
}
