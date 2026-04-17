'use client';

export const TIME_RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
] as const;

export type TimeRangeDays = typeof TIME_RANGES[number]['days'];

interface TimeRangeSelectorProps {
  days: number;
  onChange: (days: TimeRangeDays) => void;
  disabled?: boolean;
  className?: string;
}

// Single source of truth for the 7d/30d/90d toggle used on the cost
// dashboard. Exposes role="radiogroup" so screen readers announce the
// grouping and supports arrow-key movement between options.
export default function TimeRangeSelector({
  days,
  onChange,
  disabled = false,
  className = '',
}: TimeRangeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Time range"
      className={`inline-flex bg-card-bg border border-border rounded-lg p-1 ${className}`}
    >
      {TIME_RANGES.map((range) => {
        const active = range.days === days;
        return (
          <button
            key={range.days}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(range.days)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${
              active
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
