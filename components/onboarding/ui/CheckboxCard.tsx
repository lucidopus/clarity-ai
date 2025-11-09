'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CheckboxCardProps {
  id: string;
  label: string;
  icon?: ReactNode; // Optional icon (emoji or React component)
  isSelected: boolean;
  onToggle: () => void;
  description?: string;
}

/**
 * CheckboxCard - Multi-select toggle card
 *
 * Features:
 * - Visual card-based checkbox alternative
 * - Smooth hover and selection animations (200ms)
 * - Accessible keyboard navigation (Space/Enter to toggle)
 * - Touch-friendly 44px+ minimum height
 * - WCAG AA compliant contrast
 */
export default function CheckboxCard({
  id,
  label,
  icon,
  isSelected,
  onToggle,
  description,
}: CheckboxCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full p-4 rounded-lg border-2 text-left
        transition-all duration-200 ease-out
        min-h-[44px] cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
        dark:focus:ring-offset-background
        ${
          isSelected
            ? 'border-accent bg-accent/5 text-accent'
            : 'border-border hover:border-accent/50 text-foreground bg-card'
        }
      `}
      role="checkbox"
      aria-checked={isSelected}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-description` : undefined}
      tabIndex={0}
    >
      {/* Icon (if provided) */}
      {icon && (
        <div className="flex items-center gap-3">
          <div className="text-2xl flex-shrink-0" aria-hidden="true">
            {icon}
          </div>
          <div className="flex-1">
            <div id={`${id}-label`} className="font-medium">
              {label}
            </div>
            {description && (
              <p
                id={`${id}-description`}
                className="mt-1 text-xs text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* No icon layout */}
      {!icon && (
        <div>
          <div id={`${id}-label`} className="font-medium">
            {label}
          </div>
          {description && (
            <p
              id={`${id}-description`}
              className="mt-1 text-xs text-muted-foreground"
            >
              {description}
            </p>
          )}
        </div>
      )}

      {/* Selection indicator (checkmark) */}
      <motion.div
        initial={false}
        animate={{
          opacity: isSelected ? 1 : 0,
          scale: isSelected ? 1 : 0.5,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="absolute top-3 right-3"
        aria-hidden="true"
      >
        <svg
          className="w-5 h-5 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </motion.div>
    </motion.button>
  );
}
