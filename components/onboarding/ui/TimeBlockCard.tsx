'use client';

import { motion } from 'framer-motion';

interface TimeBlockCardProps {
  id: string;
  label: string;
  minutes: number; // Time value in minutes
  icon?: string; // Optional emoji icon
  isSelected: boolean;
  onSelect: () => void;
  description?: string;
}

/**
 * TimeBlockCard - Visual time representation card
 *
 * Features:
 * - Visual time blocks with clear labels
 * - Smooth selection animations (200ms)
 * - Accessible keyboard navigation
 * - Touch-friendly design
 * - WCAG AA compliant
 */
export default function TimeBlockCard({
  id,
  label,
  minutes,
  icon,
  isSelected,
  onSelect,
  description,
}: TimeBlockCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  // Format minutes to human-readable format
  const formatTime = (mins: number): string => {
    if (mins < 60) {
      return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) {
      return `${hours}${hours === 1 ? ' hour' : ' hours'}`;
    }
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`
        relative w-full p-5 rounded-lg border-2 text-center
        transition-all duration-200 ease-out
        h-[120px] cursor-pointer flex flex-col items-center justify-center
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
        dark:focus:ring-offset-background
        ${
          isSelected
            ? 'border-accent bg-accent/5 text-accent shadow-lg shadow-accent/10'
            : 'border-border hover:border-accent/50 text-foreground bg-card'
        }
      `}
      role="radio"
      aria-checked={isSelected}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-description` : undefined}
      tabIndex={0}
    >
      {/* Icon */}
      {icon && (
        <motion.div
          initial={false}
          animate={{
            scale: isSelected ? 1.1 : 1,
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="text-3xl mb-2"
          aria-hidden="true"
        >
          {icon}
        </motion.div>
      )}

      {/* Time Display */}
      <div id={`${id}-label`} className="font-bold text-lg">
        {formatTime(minutes)}
      </div>

      {/* Label */}
      <div className="text-sm mt-1 font-medium">
        {label}
      </div>

      {/* Description */}
      {description && (
        <p
          id={`${id}-description`}
          className="mt-2 text-xs text-muted-foreground"
        >
          {description}
        </p>
      )}

      {/* Selection indicator */}
      <motion.div
        initial={false}
        animate={{
          opacity: isSelected ? 1 : 0,
          scale: isSelected ? 1 : 0.5,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="absolute top-2 right-2"
        aria-hidden="true"
      >
        <svg
          className="w-5 h-5 text-accent"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <circle cx="10" cy="10" r="10" />
          <path
            fill="white"
            d="M8.5 12.5l-2.5-2.5-1 1 3.5 3.5 6-6-1-1z"
          />
        </svg>
      </motion.div>
    </motion.button>
  );
}
