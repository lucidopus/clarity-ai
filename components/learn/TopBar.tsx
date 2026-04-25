'use client';

import { MonitorPlay, BookOpen, Search } from 'lucide-react';

interface TopBarProps {
  mode: 'theater' | 'study';
  onToggleMode: () => void;
  onOpenCommandPalette: () => void;
}

export default function TopBar({ mode, onToggleMode, onOpenCommandPalette }: TopBarProps) {
  // Segmented-control semantics: clicking the *active* pill is a no-op so
  // a Theater→Theater click doesn't silently flip to Study. Without this
  // gate both pills become a generic toggle and the segmented mental model
  // breaks (Nielsen H4 — consistency).
  const goToTheater = () => {
    if (mode !== 'theater') onToggleMode();
  };
  const goToStudy = () => {
    if (mode !== 'study') onToggleMode();
  };
  const isTheater = mode === 'theater';
  const isStudy = mode === 'study';

  return (
    <div
      className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2.5 border-b shrink-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2 shrink-0 justify-self-start" role="group" aria-label="View mode">
        <button
          type="button"
          onClick={goToTheater}
          aria-pressed={isTheater}
          className={`inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 py-1 transition-colors ${
            isTheater ? 'cursor-default' : 'cursor-pointer'
          }`}
          style={{
            background:
              isTheater ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--background)',
            color: isTheater ? 'var(--accent)' : 'var(--secondary)',
            border: `1px solid ${isTheater ? 'transparent' : 'var(--border)'}`,
          }}
          title="Theater mode"
        >
          <MonitorPlay size={12} />
          Theater
        </button>
        <button
          type="button"
          onClick={goToStudy}
          aria-pressed={isStudy}
          className={`inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 py-1 transition-colors ${
            isStudy ? 'cursor-default' : 'cursor-pointer'
          }`}
          style={{
            background:
              isStudy ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--background)',
            color: isStudy ? 'var(--accent)' : 'var(--secondary)',
            border: `1px solid ${isStudy ? 'transparent' : 'var(--border)'}`,
          }}
          title="Study mode — opens notes panel"
        >
          <BookOpen size={12} />
          Study
        </button>
      </div>

      <SearchTrigger onOpen={onOpenCommandPalette} />

      {/* Empty right column keeps the search optically centered regardless of
          left toggle width (font/locale-tolerant; no hardcoded spacer). */}
      <div aria-hidden />
    </div>
  );
}

function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search anything"
      title="Search (⌘P)"
      className="w-[clamp(280px,40vw,480px)] flex items-center gap-2.5 pl-3.5 pr-1.5 py-1.5 rounded-full cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      style={{
        background: 'var(--background)',
        border: '1px solid var(--border)',
        color: 'var(--secondary)',
      }}
    >
      <Search size={14} className="shrink-0" />
      <span
        className="flex-1 text-left text-[12.5px] truncate"
        style={{ opacity: 0.75 }}
      >
        Search anything
      </span>
      <span
        className="font-mono inline-flex items-center justify-center rounded-full shrink-0"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          color: 'var(--secondary)',
          fontSize: 10,
          height: 20,
          padding: '0 6px',
          letterSpacing: '0.04em',
        }}
      >
        ⌘P
      </span>
    </button>
  );
}
