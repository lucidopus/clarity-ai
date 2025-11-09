
import React from 'react';

interface RankedChipSelectorProps {
  label: string;
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  maxSelections: number;
  description: string;
}

const RankedChipSelector: React.FC<RankedChipSelectorProps> = ({
  label,
  options,
  selectedOptions,
  onChange,
  maxSelections,
  description,
}) => {
  const handleSelect = (option: string) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter((item) => item !== option));
    } else if (selectedOptions.length < maxSelections) {
      onChange([...selectedOptions, option]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleSelect(option)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              selectedOptions.includes(option)
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-background hover:bg-accent/50'
            }`}
          >
            {selectedOptions.includes(option) && (
              <span className="mr-1.5 font-bold">
                {selectedOptions.indexOf(option) + 1}
              </span>
            )}
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RankedChipSelector;
