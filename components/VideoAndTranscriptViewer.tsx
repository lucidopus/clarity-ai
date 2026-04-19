'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useYouTubePlayer } from './learn/useYouTubePlayer';
import VideoStage from './learn/VideoStage';
import NotesPanel from './learn/NotesPanel';
import CommandPalette from './learn/CommandPalette';
import SegmentNotePopup from './learn/SegmentNotePopup';
import UpNextCard from './learn/UpNextCard';
import TopBar from './learn/TopBar';
import {
  findActiveSegmentIndex,
  getYouTubeVideoId,
} from './learn/utils';
import type { TranscriptSegment, Chapter, NotesShape, SaveNotes } from './learn/types';

interface VideoAndTranscriptViewerProps {
  transcript: TranscriptSegment[];
  videoId: string;
  youtubeUrl: string;
  chapters?: Chapter[];
  videoTitle?: string;
  summary?: string;
  notes: NotesShape;
  onSaveNotes: SaveNotes;
  autoplayVideos?: boolean;
}

export default function VideoAndTranscriptViewer({
  transcript,
  youtubeUrl,
  chapters = [],
  videoTitle,
  notes,
  onSaveNotes,
  autoplayVideos = false,
}: VideoAndTranscriptViewerProps) {
  const ytId = useMemo(() => getYouTubeVideoId(youtubeUrl) || '', [youtubeUrl]);

  const player = useYouTubePlayer({ videoId: ytId, autoplay: autoplayVideos });
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  // Default to study mode → notes open. Users land here from a material click;
  // they came here to study, not just to watch.
  const [mode, setMode] = useState<'theater' | 'study'>('study');
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [popupSegmentIndex, setPopupSegmentIndex] = useState<number | null>(null);
  const [showHints, setShowHints] = useState(true);

  // Hide hints after 8s
  useEffect(() => {
    const t = setTimeout(() => setShowHints(false), 8000);
    return () => clearTimeout(t);
  }, []);

  // Notes-open ↔ Study; Notes-collapsed ↔ Theater. Always in sync.
  const toggleNotes = useCallback(() => {
    setNotesCollapsed((c) => {
      const next = !c;
      setMode(next ? 'theater' : 'study');
      return next;
    });
  }, []);
  const toggleCaptions = useCallback(() => setShowCaptions((s) => !s), []);
  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next = m === 'theater' ? 'study' : 'theater';
      setNotesCollapsed(next === 'theater');
      return next;
    });
  }, []);

  const openSegmentNotePopup = useCallback(
    (idx?: number) => {
      const target =
        idx ?? findActiveSegmentIndex(transcript, player.currentTime);
      if (target < 0) return;
      try {
        player.pause();
      } catch {
        // ignore
      }
      setPopupSegmentIndex(target);
    },
    [transcript, player]
  );

  const closeSegmentNotePopup = useCallback(() => {
    setPopupSegmentIndex(null);
    try {
      player.play();
    } catch {
      // ignore
    }
  }, [player]);

  const popupSegmentId = popupSegmentIndex != null ? `segment-${popupSegmentIndex}` : null;
  const existingNoteContent = useMemo(() => {
    if (!popupSegmentId) return '';
    return notes.segmentNotes.find((n) => n.segmentId === popupSegmentId)?.content || '';
  }, [popupSegmentId, notes.segmentNotes]);

  const saveSegmentNote = useCallback(
    async (content: string) => {
      if (!popupSegmentId) return;
      const now = new Date();
      const existing = notes.segmentNotes.find((n) => n.segmentId === popupSegmentId);
      const updatedSegmentNotes = existing
        ? notes.segmentNotes.map((n) =>
            n.segmentId === popupSegmentId
              ? { ...n, content, updatedAt: now }
              : n
          )
        : [
            ...notes.segmentNotes,
            { segmentId: popupSegmentId, content, createdAt: now, updatedAt: now },
          ];
      await onSaveNotes({ ...notes, segmentNotes: updatedSegmentNotes });
    },
    [popupSegmentId, notes, onSaveNotes]
  );

  const deleteSegmentNote = useCallback(async () => {
    if (!popupSegmentId) return;
    await onSaveNotes({
      ...notes,
      segmentNotes: notes.segmentNotes.filter((n) => n.segmentId !== popupSegmentId),
    });
  }, [popupSegmentId, notes, onSaveNotes]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      const mod = e.metaKey || e.ctrlKey;

      // ⌘/ → segment note popup at current moment ("/" = comment in many editors)
      if (mod && e.key === '/') {
        e.preventDefault();
        openSegmentNotePopup();
        return;
      }
      // ⌘P → command palette (search)
      if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      // "N" (no modifier) → toggle notes panel (outside inputs)
      if (
        !mod &&
        !e.altKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'n' &&
        !inField &&
        !paletteOpen &&
        popupSegmentIndex == null
      ) {
        e.preventDefault();
        toggleNotes();
        return;
      }
      if (e.key === ' ' && !inField && !paletteOpen && popupSegmentIndex == null) {
        e.preventDefault();
        player.togglePlay();
        return;
      }
      // ← / → → seek ±5s (outside inputs, palette, and popups)
      if (
        !mod &&
        !e.altKey &&
        !e.shiftKey &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        !inField &&
        !paletteOpen &&
        popupSegmentIndex == null
      ) {
        e.preventDefault();
        const delta = e.key === 'ArrowLeft' ? -5 : 5;
        player.seek(player.currentTime + delta);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    toggleNotes,
    openSegmentNotePopup,
    player,
    paletteOpen,
    popupSegmentIndex,
  ]);

  if (!ytId) {
    return (
      <div className="w-full h-full grid place-items-center p-8">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">Unable to load video</h3>
          <p className="text-secondary">The YouTube URL could not be parsed.</p>
        </div>
      </div>
    );
  }

  const paletteActions = [
    {
      id: 'add-segment-note',
      label: 'Add segment note at the current moment',
      shortcut: '⌘/',
      run: () => openSegmentNotePopup(),
    },
    {
      id: 'open-search',
      label: 'Open actions palette',
      shortcut: '⌘P',
      run: () => setPaletteOpen(true),
    },
    {
      id: 'toggle-notes',
      label: notesCollapsed ? 'Open notes panel' : 'Collapse notes panel',
      shortcut: 'N',
      run: () => toggleNotes(),
    },
    {
      id: 'toggle-mode',
      label: mode === 'theater' ? 'Switch to Study mode' : 'Switch to Theater mode',
      run: () => toggleMode(),
    },
    {
      id: 'toggle-captions',
      label: showCaptions ? 'Hide captions' : 'Show captions',
      shortcut: 'C',
      run: () => toggleCaptions(),
    },
  ];

  const notesWidth = 460;

  return (
    <div
      className="relative w-full flex flex-col lg:flex-row overflow-hidden rounded-xl sm:rounded-2xl border border-border lg:h-[calc(100dvh-200px)] lg:min-h-[640px]"
      style={{
        background: 'var(--background)',
      }}
    >
      <TopBar mode={mode} onToggleMode={toggleMode} />

      {/* Center: video — full aspect on mobile, flexible on lg+. Extra
          bottom padding on <lg reserves space for the fixed Notes handle. */}
      <section className="flex-1 min-w-0 flex flex-col relative px-3 sm:px-4 pt-3 sm:pt-[3.25rem] pb-16 sm:pb-4 min-h-[60dvh] lg:min-h-0 lg:pb-4">
        <VideoStage
          containerRef={player.containerRef}
          scrubberRef={scrubberRef}
          isReady={player.isReady}
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          volume={player.volume}
          isMuted={player.isMuted}
          playbackRate={player.playbackRate}
          togglePlay={player.togglePlay}
          seek={player.seek}
          setVolume={player.setVolume}
          toggleMute={player.toggleMute}
          setRate={player.setRate}
          transcript={transcript}
          chapters={chapters}
          segmentNotes={notes.segmentNotes}
          showCaptions={showCaptions}
          toggleCaptions={toggleCaptions}
          notesCollapsed={notesCollapsed}
          showHints={showHints}
        />
      </section>

      <NotesPanel
        videoTitle={videoTitle}
        notes={notes}
        onSaveNotes={onSaveNotes}
        collapsed={notesCollapsed}
        onToggleCollapse={toggleNotes}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        onAddSegmentNote={() => openSegmentNotePopup()}
        transcript={transcript}
        onSeek={player.seek}
        onEditSegmentNote={(idx) => openSegmentNotePopup(idx)}
        width={notesWidth}
      />

      {/* Up Next floats at viewer root so it doesn't cover the player */}
      <UpNextCard
        currentTime={player.currentTime}
        chapters={chapters}
        segmentNotes={notes.segmentNotes}
        transcript={transcript}
        onSeek={player.seek}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        transcript={transcript}
        chapters={chapters}
        segmentNotes={notes.segmentNotes}
        currentTime={player.currentTime}
        onSeek={player.seek}
        actions={paletteActions}
      />

      <SegmentNotePopup
        open={popupSegmentIndex != null}
        segmentIndex={popupSegmentIndex}
        transcript={transcript}
        initialContent={existingNoteContent}
        isExisting={Boolean(existingNoteContent)}
        onClose={closeSegmentNotePopup}
        onSave={saveSegmentNote}
        onDelete={existingNoteContent ? deleteSegmentNote : undefined}
        scrubberRef={scrubberRef}
        duration={player.duration}
        chapters={chapters}
      />
    </div>
  );
}
