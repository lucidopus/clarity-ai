'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Keyboard,
  PanelRightClose,
} from 'lucide-react';
import type { Chapter, TranscriptSegment } from './types';
import { findActiveSegmentIndex, formatTimestamp, clamp } from './utils';

interface VideoStageProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
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
  showCaptions: boolean;
  toggleCaptions: () => void;
  notesCollapsed: boolean;
  showHints: boolean;
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function VideoStage({
  containerRef,
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
  showCaptions,
  toggleCaptions,
  notesCollapsed,
  showHints,
}: VideoStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const [scrubDragging, setScrubDragging] = useState(false);
  const [hoverControls, setHoverControls] = useState(false);

  const activeIdx = useMemo(
    () => findActiveSegmentIndex(transcript, currentTime),
    [transcript, currentTime]
  );

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
    [seek, safeDuration]
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
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  }, []);

  const cycleRate = useCallback(() => {
    const idx = RATES.indexOf(playbackRate);
    const next = RATES[(idx + 1) % RATES.length] ?? 1;
    setRate(next);
  }, [playbackRate, setRate]);

  return (
    <div
      ref={stageRef}
      onMouseEnter={() => setHoverControls(true)}
      onMouseLeave={() => setHoverControls(false)}
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

      {/* Hint chips */}
      {showHints && (
        <>
          <div
            className="pointer-events-none absolute z-20 inline-flex items-center gap-1.5 rounded-lg text-[11px]"
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
              className="pointer-events-none absolute z-20 inline-flex items-center gap-1.5 rounded-lg text-[11px]"
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

      {/* Bottom controls */}
      <div
        className={`absolute left-0 right-0 bottom-0 z-30 px-6 py-5 transition-opacity duration-200 ${
          isPlaying && !hoverControls ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background: 'linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0,0,0,0.6) 100%)',
        }}
      >
        {/* Scrubber */}
        <div
          ref={scrubberRef}
          onMouseDown={handleScrubMouseDown}
          className="relative mb-3 cursor-pointer"
          style={{
            height: 4,
          }}
        >
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
          {/* Chapter markers */}
          {duration > 0 &&
            chapters.map((c, i) => {
              const pct = clamp((c.timeSeconds / safeDuration) * 100, 0, 100);
              const done = c.timeSeconds < currentTime;
              return (
                <button
                  key={`ch-${i}-${c.timeSeconds}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    seek(c.timeSeconds);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="group/marker absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid place-items-center"
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
                    className="pointer-events-none absolute opacity-0 group-hover/marker:opacity-100 transition-opacity duration-150 whitespace-nowrap rounded-md"
                    style={{
                      bottom: 18,
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
        </div>

        <div className="flex items-center justify-between text-[12px] text-white/85">
          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={() => seek(currentTime - 10)}
              className="hover:text-white"
              title="Back 10s"
            >
              <SkipBack size={16} />
            </button>
            <button type="button" onClick={togglePlay} className="hover:text-white" title="Play / Pause (Space)">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              onClick={() => seek(currentTime + 10)}
              className="hover:text-white"
              title="Forward 10s"
            >
              <SkipForward size={16} />
            </button>
            <span className="font-mono text-white/85">
              {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
            </span>
          </div>
          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={cycleRate}
              className="font-mono text-white/60 hover:text-white"
              title="Playback speed"
            >
              {playbackRate}×
            </button>
            <button
              type="button"
              onClick={toggleCaptions}
              className={`hover:text-white ${showCaptions ? 'text-white' : 'text-white/60'}`}
              title="Toggle captions"
            >
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-white/30">CC</span>
            </button>
            <div className="flex items-center gap-2 group/vol">
              <button type="button" onClick={toggleMute} className="hover:text-white" title="Mute">
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-white opacity-0 group-hover/vol:opacity-100"
              />
            </div>
            <button type="button" onClick={requestFullscreen} className="hover:text-white" title="Fullscreen">
              <Maximize size={16} />
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
