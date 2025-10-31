'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
  color?: 'accent' | 'green' | 'blue' | 'red';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export default function ProgressBar({
  progress,
  className = '',
  showPercentage = false,
  color = 'accent',
  size = 'md',
  animated = true
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    accent: 'bg-accent',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-border rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <motion.div
          className={`h-full ${colorClasses[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{
            duration: animated ? 0.5 : 0,
            ease: 'easeOut'
          }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-muted-foreground mt-1 text-center">
          {Math.round(clampedProgress)}%
        </div>
      )}
    </div>
  );
}