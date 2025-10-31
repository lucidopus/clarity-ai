'use client';

import { useState } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  options: FilterOption[];
  defaultValue?: string;
  onFilterChange?: (value: string) => void;
  className?: string;
}

export default function FilterDropdown({
  options,
  defaultValue,
  onFilterChange,
  className = '',
}: FilterDropdownProps) {
  const [selectedValue, setSelectedValue] = useState(defaultValue || options[0]?.value || '');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    if (onFilterChange) {
      onFilterChange(value);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <select
        value={selectedValue}
        onChange={handleChange}
        className="w-full appearance-none bg-card-bg border border-border rounded-lg px-4 py-2 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5 text-muted-foreground"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
          />
        </svg>
      </div>
    </div>
  );
}
