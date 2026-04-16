'use client';

import { MonitorPlay, BookOpen } from 'lucide-react';

interface TopBarProps {
  mode: 'theater' | 'study';
  onToggleMode: () => void;
}

export default function TopBar({ mode, onToggleMode }: TopBarProps) {
  return (
    <div className="absolute z-50 flex gap-2 items-center" style={{ top: 12, left: 16 }}>
      <button
        type="button"
        onClick={onToggleMode}
        className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 py-1 cursor-pointer transition-colors"
        style={{
          background:
            mode === 'theater' ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--background)',
          color: mode === 'theater' ? 'var(--accent)' : 'var(--secondary)',
          border: `1px solid ${mode === 'theater' ? 'transparent' : 'var(--border)'}`,
        }}
        title="Theater mode"
      >
        <MonitorPlay size={12} />
        Theater
      </button>
      <button
        type="button"
        onClick={onToggleMode}
        className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 py-1 cursor-pointer transition-colors"
        style={{
          background:
            mode === 'study' ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--background)',
          color: mode === 'study' ? 'var(--accent)' : 'var(--secondary)',
          border: `1px solid ${mode === 'study' ? 'transparent' : 'var(--border)'}`,
        }}
        title="Study mode — opens notes panel"
      >
        <BookOpen size={12} />
        Study
      </button>
    </div>
  );
}
