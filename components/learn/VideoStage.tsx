'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Keyboard,
  PanelRightClose,
} from 'lucide-react';
import type { Chapter, SegmentNote, TranscriptSegment } from './types';
import { findActiveSegmentIndex, formatTimestamp, clamp } from './utils';

interface VideoStageProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrubberRef?: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  togglePlay: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setRate: (r: number) => void;
  transcript: TranscriptSegment[];
  chapters?: Chapter[];
  segmentNotes?: SegmentNote[];
  showCaptions: boolean;
  toggleCaptions: () => void;
  notesCollapsed: boolean;
  showHints: boolean;
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Anchor scrubber tooltips so they don't get clipped by the player's
// `overflow-hidden` edges. Buttons are 14px wide and centered on `pct%`
// (their inner box spans `pct% ± 7px`), so anchoring `left: 0` extends
// the tooltip rightward from the button's left edge, and `right: 0`
// extends it leftward from the button's right edge.
function tooltipAnchorFor(pct: number): React.CSSProperties {
  if (pct < 18) return { left: 0 };
  if (pct > 82) return { right: 0 };
  return { left: '50%', transform: 'translateX(-50%)' };
}

export default function VideoStage({
  containerRef,
  scrubberRef: externalScrubberRef,
  isReady,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  togglePlay,
  seek,
  setVolume,
  toggleMute,
  setRate,
  transcript,
  chapters = [],
  segmentNotes = [],
  showCaptions,
  toggleCaptions,
  notesCollapsed,
  showHints,
}: VideoStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const [scrubDragging, setScrubDragging] = useState(false);
  // Controls visibility: shown on mouse activity inside the stage, hidden after
  // 1s of stillness. Always shown when paused (so the user can act on a frame).
  const [controlsVisible, setControlsVisible] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showControlsTransiently = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      idleTimerRef.current = null;
    }, 1000);
  }, []);

  const handleMouseLeaveStage = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setControlsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const activeIdx = useMemo(
    () => findActiveSegmentIndex(transcript, currentTime),
    [transcript, currentTime]
  );

  const noteMarkers = useMemo(() => {
    const MAX_PREVIEW = 42;
    return segmentNotes
      .map((n) => {
        const m = n.segmentId.match(/segment-(\d+)/);
        if (!m) return null;
        const idx = parseInt(m[1], 10);
        const seg = transcript[idx];
        if (!seg) return null;
        const cleaned = (n.content || '')
          .replace(/\\([\s\S])/g, '$1') // unescape markdown escapes (e.g. It\'s → It's)
          .replace(/[#*_>`-]/g, '')
          .trim()
          .split('\n')[0]
          .trim();
        const preview = cleaned.length > MAX_PREVIEW
          ? `${cleaned.slice(0, MAX_PREVIEW).trimEnd()}…`
          : cleaned || 'Note';
        return { time: seg.start, preview };
      })
      .filter((m): m is { time: number; preview: string } => m !== null);
  }, [segmentNotes, transcript]);

  const captionText = activeIdx >= 0 ? transcript[activeIdx]?.text : '';

  const safeDuration = duration > 0 ? duration : 1;
  const progressPct = clamp((currentTime / safeDuration) * 100, 0, 100);

  const seekFromScrubber = useCallback(
    (clientX: number) => {
      const el = scrubberRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      seek((pct / 100) * safeDuration);
    },
    [seek, safeDuration, scrubberRef]
  );

  const handleScrubMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setScrubDragging(true);
      seekFromScrubber(e.clientX);
    },
    [seekFromScrubber]
  );

  useEffect(() => {
    if (!scrubDragging) return;
    const onMove = (e: MouseEvent) => seekFromScrubber(e.clientX);
    const onUp = () => setScrubDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [scrubDragging, seekFromScrubber]);

  const requestFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Vendor-prefixed fullscreen API shims. iOS Safari <16.4 exposes
    // webkit* variants; newer Chromium/Safari use the standard names. We try
    // the YouTube iframe first (it owns the actual video element) then the
    // stage div as a fallback for non-video fullscreen.
    type FullscreenEl = HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      webkitEnterFullscreen?: () => void;
      msRequestFullscreen?: () => Promise<void> | void;
    };
    type FullscreenDoc = Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
      msFullscreenElement?: Element | null;
      msExitFullscreen?: () => Promise<void> | void;
    };
    const doc = document as FullscreenDoc;

    // Exit if already fullscreen.
    if (document.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else if (doc.msExitFullscreen) doc.msExitFullscreen();
      return;
    }

    // Try the stage first — desktop Chrome/Safari/Firefox support
    // `requestFullscreen()` on arbitrary elements, and this preserves our
    // custom control bar (scrubber, markers, notes button) inside the
    // fullscreen view. On iOS Safari, stage.requestFullscreen rejects, so
    // we fall back to requesting on the YouTube iframe (which owns a
    // <video> element and is the only element iOS will fullscreen).
    const iframe = stage.querySelector('iframe') as FullscreenEl | null;
    const stageEl = stage as FullscreenEl;

    const requestOn = (el: FullscreenEl): Promise<void> => {
      if (el.requestFullscreen) {
        const result = el.requestFullscreen();
        return Promise.resolve(result).then(() => undefined);
      }
      if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        return Promise.resolve();
      }
      if (el.webkitEnterFullscreen) {
        el.webkitEnterFullscreen();
        return Promise.resolve();
      }
      return Promise.reject(new Error('Fullscreen not supported'));
    };

    requestOn(stageEl).catch(() => {
      // iOS Safari and legacy browsers: fall back to the iframe/video.
      if (iframe) {
        requestOn(iframe).catch(() => {});
      }
    });
  }, []);

  const cycleRate = useCallback(() => {
    const idx = RATES.indexOf(playbackRate);
    const next = RATES[(idx + 1) % RATES.length] ?? 1;
    setRate(next);
  }, [playbackRate, setRate]);

  return (
    <div
      ref={stageRef}
      onMouseMove={showControlsTransiently}
      onMouseLeave={handleMouseLeaveStage}
      className="relative rounded-2xl overflow-hidden flex-1 min-h-0 group/stage"
      style={{
        background:
          'radial-gradient(120% 80% at 30% 20%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 60%), radial-gradient(80% 60% at 80% 90%, rgba(168,85,247,0.07), transparent 60%), linear-gradient(180deg, #06080d, #0a0e16)',
      }}
    >
      {/* Player iframe mount — pointer-events: none prevents YT from showing hover-triggered title/control overlays */}
      <div ref={containerRef} className="absolute inset-0" style={{ pointerEvents: 'none' }} />

      {/* Pause overlay: hides YouTube's "More videos" / title overlay that appears when paused */}
      <div
        className={`pointer-events-none absolute inset-0 z-5 transition-opacity duration-200 ${
          isPlaying ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background:
            'linear-gradient(180deg, rgba(6,8,13,0.78) 0%, rgba(6,8,13,0.55) 30%, rgba(6,8,13,0.55) 70%, rgba(6,8,13,0.88) 100%)',
        }}
      />

      {/* Click-shield: catches clicks (since YouTube chrome is hidden) and toggles play */}
      <button
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={togglePlay}
        className="absolute inset-0 z-10 cursor-pointer"
        style={{ background: 'transparent' }}
      />

      {/* Center play button — only visible when paused (hover never reveals it; we don't want to cover content) */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-200 ${
          isPlaying ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          className="rounded-full grid place-items-center transition-transform duration-200 hover:scale-105"
          style={{
            width: 56,
            height: 56,
            background: 'rgba(255,255,255,0.94)',
            color: '#06080d',
            backdropFilter: 'blur(6px)',
          }}
        >
          {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </div>
      </div>

      {/* Karaoke caption */}
      {showCaptions && captionText && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-20 text-center"
          style={{
            bottom: 56,
            background: 'rgba(8,11,17,0.78)',
            backdropFilter: 'blur(8px)',
            color: '#f3f4f6',
            padding: '8px 16px',
            borderRadius: 10,
            fontSize: 15,
            lineHeight: 1.5,
            maxWidth: '70%',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          {captionText}
        </div>
      )}

      {/* Hint chips — desktop only; mobile has no keyboard so these are pure
          chrome noise there. The visible Notes / Actions buttons cover the
          same actions on phones. */}
      {showHints && (
        <>
          <div
            className="pointer-events-none absolute z-20 hidden lg:inline-flex items-center gap-1.5 rounded-lg text-[11px]"
            style={{
              top: 16,
              left: 16,
              background: 'rgba(17,21,28,0.72)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.85)',
              padding: '6px 10px',
            }}
          >
            <Keyboard size={12} />
            <span>⌘P</span>
            <span style={{ opacity: 0.7 }}>· actions</span>
          </div>
          {notesCollapsed && (
            <div
              className="pointer-events-none absolute z-20 hidden lg:inline-flex items-center gap-1.5 rounded-lg text-[11px]"
              style={{
                top: 16,
                right: 16,
                background: 'rgba(17,21,28,0.72)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.85)',
                padding: '6px 10px',
              }}
            >
              <PanelRightClose size={12} />
              <span>N</span>
              <span style={{ opacity: 0.7 }}>· toggle notes</span>
            </div>
          )}
        </>
      )}

      {/* Bottom controls — visible on mouse activity (idle 1s → hide), and
          always visible when paused so users can interact with what they see. */}
      <div
        className={`absolute left-0 right-0 bottom-0 z-30 px-6 py-5 transition-opacity duration-200 ${
          isPlaying && !controlsVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          background: 'linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0,0,0,0.6) 100%)',
        }}
      >
        {/* Scrubber */}
        <div
          ref={(node) => {
            scrubberRef.current = node;
            if (externalScrubberRef) {
              externalScrubberRef.current = node;
            }
          }}
          onMouseDown={handleScrubMouseDown}
          className="relative mb-3 cursor-pointer"
          style={{
            height: 4,
          }}
        >
          {/* Invisible hit-area extension — gives the cursor ±8px of slop
              around the 4px track so the user doesn't need pixel-perfect
              alignment to scrub or land on a chapter dot. Doesn't affect
              layout (absolute) so the buttons below stay where they are. */}
          <div
            aria-hidden
            className="absolute left-0 right-0"
            style={{ top: -8, bottom: -8 }}
          />
          {/* Track */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          />
          {/* Progress fill */}
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full pointer-events-none"
            style={{ width: `${progressPct}%`, background: 'var(--accent)' }}
          />
          {/* Chapter markers — rendered last so they sit visually on top of note dots
              when timestamps overlap */}
          {duration > 0 &&
            chapters.map((c, i) => {
              const pct = clamp((c.timeSeconds / safeDuration) * 100, 0, 100);
              const done = c.timeSeconds < currentTime;
              const tooltipAnchor = tooltipAnchorFor(pct);
              return (
                <button
                  key={`ch-${i}-${c.timeSeconds}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    seek(c.timeSeconds);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="group/marker absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid place-items-center z-10 cursor-pointer"
                  style={{
                    left: `${pct}%`,
                    width: 14,
                    height: 14,
                  }}
                  aria-label={`Seek to ${formatTimestamp(c.timeSeconds)} — ${c.topic}`}
                >
                  <span
                    className="block rounded-full transition-transform duration-150 group-hover/marker:scale-125"
                    style={{
                      width: 8,
                      height: 8,
                      background: done ? 'var(--accent)' : '#fff',
                      border: '2px solid rgba(0,0,0,0.45)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    }}
                  />
                  <div
                    className="pointer-events-none hidden sm:block absolute opacity-0 group-hover/marker:opacity-100 transition-opacity duration-150 whitespace-nowrap rounded-md"
                    style={{
                      bottom: 18,
                      ...tooltipAnchor,
                      background: 'rgba(17,21,28,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f3f4f6',
                      padding: '5px 9px',
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    <span
                      className="font-mono mr-1.5 px-1 py-px rounded uppercase tracking-wider"
                      style={{
                        fontSize: 9,
                        background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                        color: 'var(--accent)',
                      }}
                    >
                      Chapter
                    </span>
                    {c.topic}
                    <span className="ml-1.5 font-mono opacity-60">
                      {formatTimestamp(c.timeSeconds)}
                    </span>
                  </div>
                </button>
              );
            })}
          {/* Active track tint — paints the 10s lead-in window inside the
              seekbar track itself, so the playhead visually passes through
              the zone where the Up Next card surfaces. Brightens when the
              playhead is in-window, fades out once the anchor is crossed. */}
          {duration > 0 &&
            noteMarkers.map((n, i) => {
              const anchorPct = clamp((n.time / safeDuration) * 100, 0, 100);
              const triggerTime = Math.max(0, n.time - 10);
              const triggerPct = clamp((triggerTime / safeDuration) * 100, 0, 100);
              const inWindow = currentTime >= triggerTime && currentTime < n.time;
              const passed = currentTime >= n.time;
              return (
                <div
                  key={`note-tint-${i}-${n.time}`}
                  className="pointer-events-none absolute rounded-full transition-opacity duration-200"
                  style={{
                    left: `${triggerPct}%`,
                    width: `${Math.max(anchorPct - triggerPct, 0.4)}%`,
                    top: 0,
                    bottom: 0,
                    opacity: passed ? 0 : inWindow ? 1 : 0.55,
                    background:
                      'linear-gradient(to right, rgba(250,204,21,0.10) 0%, rgba(250,204,21,0.70) 100%)',
                  }}
                />
              );
            })}
          {/* User segment-note markers (yellow dots) */}
          {duration > 0 &&
            noteMarkers.map((n, i) => {
              const pct = clamp((n.time / safeDuration) * 100, 0, 100);
              const triggerTime = Math.max(0, n.time - 10);
              const inWindow = currentTime >= triggerTime && currentTime < n.time;
              const passed = n.time <= currentTime;
              const tooltipAnchor = tooltipAnchorFor(pct);
              const dotBg = passed
                ? '#facc15'
                : inWindow
                ? '#facc15'
                : 'rgba(250,204,21,0.45)';
              return (
                <button
                  key={`note-${i}-${n.time}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    seek(n.time);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="group/note absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid place-items-center cursor-pointer"
                  style={{
                    left: `${pct}%`,
                    width: 14,
                    height: 14,
                  }}
                  aria-label={`Jump to your note at ${formatTimestamp(n.time)}`}
                >
                  <span
                    className="block rounded-full transition-transform duration-150 group-hover/note:scale-125"
                    style={{
                      width: 8,
                      height: 8,
                      background: dotBg,
                      border: '2px solid rgba(0,0,0,0.45)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    }}
                  />
                  <div
                    className="pointer-events-none hidden sm:block absolute opacity-0 group-hover/note:opacity-100 transition-opacity duration-150 rounded-md"
                    style={{
                      bottom: 18,
                      ...tooltipAnchor,
                      background: 'rgba(17,21,28,0.95)',
                      border: '1px solid rgba(250,204,21,0.35)',
                      color: '#f3f4f6',
                      padding: '5px 9px',
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      maxWidth: 320,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      className="font-mono mr-1.5 px-1 py-px rounded uppercase tracking-wider"
                      style={{
                        fontSize: 9,
                        background: 'rgba(250,204,21,0.18)',
                        color: '#facc15',
                      }}
                    >
                      Your note
                    </span>
                    <span>{n.preview}</span>
                    <span className="ml-1.5 font-mono opacity-60">
                      {formatTimestamp(n.time)}
                    </span>
                    <span
                      className="block font-mono opacity-50 mt-0.5"
                      style={{ fontSize: 9 }}
                    >
                      Card surfaces from {formatTimestamp(Math.max(0, n.time - 10))}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>

        <div className="flex items-center justify-between text-[12px] text-white/85 gap-2">
          <div className="flex gap-3 sm:gap-4 items-center min-w-0">
            {/* Back 10s — desktop only; 5s rewind covers the same need on mobile */}
            <button
              type="button"
              onClick={() => seek(currentTime - 10)}
              className="hidden sm:inline-flex hover:text-white cursor-pointer"
              title="Back 10s"
              aria-label="Back 10 seconds"
            >
              <SkipBack size={16} />
            </button>
            <button
              type="button"
              onClick={() => seek(currentTime - 5)}
              className="relative grid place-items-center w-8 h-8 sm:w-5 sm:h-5 hover:text-white cursor-pointer"
              title="Back 5s (←)"
              aria-label="Back 5 seconds"
            >
              <RotateCcw size={20} strokeWidth={1.75} className="sm:size-[18px]" />
              <span
                className="absolute inset-0 grid place-items-center font-mono font-semibold pointer-events-none"
                style={{ fontSize: 9, paddingTop: 1 }}
              >
                5
              </span>
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="hover:text-white cursor-pointer w-9 h-9 sm:w-auto sm:h-auto grid place-items-center"
              title="Play / Pause (Space)"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={20} className="sm:size-4" /> : <Play size={20} className="sm:size-4" />}
            </button>
            <button
              type="button"
              onClick={() => seek(currentTime + 5)}
              className="relative grid place-items-center w-8 h-8 sm:w-5 sm:h-5 hover:text-white cursor-pointer"
              title="Forward 5s (→)"
              aria-label="Forward 5 seconds"
            >
              <RotateCw size={20} strokeWidth={1.75} className="sm:size-[18px]" />
              <span
                className="absolute inset-0 grid place-items-center font-mono font-semibold pointer-events-none"
                style={{ fontSize: 9, paddingTop: 1 }}
              >
                5
              </span>
            </button>
            {/* Forward 10s — desktop only */}
            <button
              type="button"
              onClick={() => seek(currentTime + 10)}
              className="hidden sm:inline-flex hover:text-white cursor-pointer"
              title="Forward 10s"
              aria-label="Forward 10 seconds"
            >
              <SkipForward size={16} />
            </button>
            <span className="font-mono text-[11px] sm:text-[12px] text-white/85 whitespace-nowrap tabular-nums">
              {formatTimestamp(currentTime)}<span className="text-white/50">/{formatTimestamp(duration)}</span>
            </span>
          </div>
          <div className="flex gap-3 sm:gap-4 items-center shrink-0">
            <button
              type="button"
              onClick={cycleRate}
              className="font-mono text-white/60 hover:text-white cursor-pointer px-1.5 min-w-9 text-center"
              title="Playback speed"
              aria-label="Playback speed"
            >
              {playbackRate}×
            </button>
            <button
              type="button"
              onClick={toggleCaptions}
              className={`hover:text-white cursor-pointer ${showCaptions ? 'text-white' : 'text-white/60'}`}
              title="Toggle captions"
              aria-label="Toggle captions"
            >
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-white/30">CC</span>
            </button>
            <div className="flex items-center gap-2 group/vol">
              <button type="button" onClick={toggleMute} className="hover:text-white cursor-pointer w-9 h-9 sm:w-auto sm:h-auto grid place-items-center" title="Mute" aria-label="Mute">
                {isMuted || volume === 0 ? <VolumeX size={18} className="sm:size-4" /> : <Volume2 size={18} className="sm:size-4" />}
              </button>
              {/* Volume slider — desktop hover only; on mobile a tap toggles mute */}
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="hidden sm:block w-0 group-hover/vol:w-20 transition-all duration-200 accent-white opacity-0 group-hover/vol:opacity-100 cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={requestFullscreen}
              className="hover:text-white cursor-pointer w-9 h-9 sm:w-auto sm:h-auto grid place-items-center"
              title="Fullscreen"
              aria-label="Fullscreen"
            >
              <Maximize size={18} className="sm:size-4" />
            </button>
          </div>
        </div>
      </div>

      {!isReady && (
        <div className="absolute inset-0 z-40 grid place-items-center">
          <div
            className="w-8 h-8 rounded-full animate-spin"
            style={{ border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.9)' }}
          />
        </div>
      )}
    </div>
  );
}
