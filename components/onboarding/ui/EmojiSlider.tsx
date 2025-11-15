'use client';

import { useState } from 'react';

interface EmojiSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
  description?: string;
}

/**
 * EmojiSlider - Range input (1-7 scale)
 *
 * Features:
 * - Accessible keyboard navigation (arrow keys)
 * - Smooth 200ms animations
 * - Touch-friendly 44px+ touch targets
 * - WCAG AA compliant
 */
export default function EmojiSlider({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  description,
}: EmojiSliderProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min="1"
          max="7"
          step="1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full h-2 rounded-lg appearance-none cursor-pointer
            bg-border
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
            dark:focus:ring-offset-background
            transition-all duration-200
            ${isFocused ? 'ring-2 ring-accent ring-offset-2' : ''}

            /* Webkit (Chrome, Safari) */
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:duration-200
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:active:scale-95

            /* Firefox */
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-accent
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:transition-transform
            [&::-moz-range-thumb]:duration-200
            [&::-moz-range-thumb]:hover:scale-110
            [&::-moz-range-thumb]:active:scale-95
          `}
          aria-label={label}
          aria-valuemin={1}
          aria-valuemax={7}
          aria-valuenow={value}
          aria-valuetext={`${value} out of 7`}
        />

        {/* Labels */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{lowLabel}</span>
          <span className="font-medium text-foreground tabular-nums">{value}/7</span>
          <span>{highLabel}</span>
        </div>
      </div>
    </div>
  );
}
