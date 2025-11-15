'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface RankedChipSelectorProps {
  label: string;
  options: string[];
  selectedOptions: string[]; // Ordered array (max 3 items)
  onChange: (selected: string[]) => void;
  maxSelections?: number;
  description?: string;
}

/**
 * RankedChipSelector - Chip selector with ranking badges (max 3 selections)
 *
 * Features:
 * - Visual ranking with numbered badges (1st, 2nd, 3rd)
 * - Order-preserving selection (first click = #1, second = #2, third = #3)
 * - Smooth 200ms animations with stagger effect
 * - Accessible keyboard navigation
 * - Touch-friendly 44px minimum height
 * - WCAG AA compliant
 */
export default function RankedChipSelector({
  label,
  options,
  selectedOptions,
  onChange,
  maxSelections = 3,
  description,
}: RankedChipSelectorProps) {
  const handleToggle = (option: string) => {
    const isSelected = selectedOptions.includes(option);

    if (isSelected) {
      // Remove from selection
      onChange(selectedOptions.filter((item) => item !== option));
    } else {
      // Add to selection (if not at max)
      if (selectedOptions.length < maxSelections) {
        onChange([...selectedOptions, option]);
      }
    }
  };

  const getRank = (option: string): number | null => {
    const index = selectedOptions.indexOf(option);
    return index !== -1 ? index + 1 : null;
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Selection Count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Selected: {selectedOptions.length}/{maxSelections}
        </span>
        {selectedOptions.length === maxSelections && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-accent font-medium"
          >
            (Max reached)
          </motion.span>
        )}
      </div>

      {/* Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((option, index) => {
          const rank = getRank(option);
          const isSelected = rank !== null;
          const isDisabled = !isSelected && selectedOptions.length >= maxSelections;

          return (
            <motion.button
              key={option}
              type="button"
              onClick={() => handleToggle(option)}
              disabled={isDisabled}
              whileHover={!isDisabled ? { scale: 1.03 } : {}}
              whileTap={!isDisabled ? { scale: 0.97 } : {}}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.03, // Stagger animation
                ease: 'easeOut',
              }}
              className={`
                relative px-4 py-3 rounded-lg border-2 text-sm font-medium
                transition-all duration-200 ease-out
                min-h-[44px] cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
                dark:focus:ring-offset-background
                ${
                  isSelected
                    ? 'border-accent bg-accent/5 text-accent'
                    : isDisabled
                    ? 'border-border bg-card/50 text-muted-foreground cursor-not-allowed opacity-60'
                    : 'border-border hover:border-accent/50 text-foreground bg-card'
                }
              `}
              aria-pressed={isSelected}
              aria-label={
                isSelected
                  ? `${option}, ranked ${rank} of ${maxSelections}`
                  : `${option}, not selected`
              }
            >
              {/* Option Text */}
              <span className={isSelected ? 'pr-6' : ''}>{option}</span>

              {/* Rank Badge */}
              <AnimatePresence>
                {isSelected && rank !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="
                      absolute top-2 right-2
                      w-6 h-6 rounded-full
                      bg-accent text-white
                      flex items-center justify-center
                      text-xs font-bold
                    "
                    aria-hidden="true"
                  >
                    {rank}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Order Display (Optional - shows ranking visually) */}
      {selectedOptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="pt-2 space-y-2"
        >
          <p className="text-xs font-medium text-foreground">Your ranking:</p>
          <div className="flex flex-wrap gap-2">
            {selectedOptions.map((option, index) => (
              <motion.div
                key={option}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm"
              >
                <span className="font-bold">#{index + 1}</span>
                <span>{option}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
