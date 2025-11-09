
import React from 'react';

interface TimeBlockCardProps {
  id: string;
  label: string;
  minutes: number;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}

const TimeBlockCard: React.FC<TimeBlockCardProps> = ({
  id,
  label,
  minutes,
  icon,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      type="button"
      id={id}
      onClick={onSelect}
      className={`w-full p-3 border rounded-lg text-center transition-all ${
        isSelected
          ? 'bg-accent text-accent-foreground border-accent shadow-lg'
          : 'bg-background hover:bg-accent/50 hover:border-accent/50'
      }`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-bold text-lg">{minutes}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </button>
  );
};

export default TimeBlockCard;
