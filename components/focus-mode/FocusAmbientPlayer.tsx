'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { AMBIENT_SOUND_URL } from '@/lib/focus-mode/ambient-tracks';

const LS_PLAYING = 'focus-mode:ambient:playing';

// Match the focus orb geometry so the two buttons read as siblings.
const ORB_SIZE = 46;
const ORB_STROKE = 3.5;
const HALO_INSET = 18;

// Long, eased volume ramps so start/stop feels like a room warming up
// rather than a switch being thrown. rAF-driven so frames stay smooth.
// FADE_OUT_MS matches the ~3s horizon-dissolve envelope on window close
// (Common Fate — sound and orb leave on the same clock).
const FADE_IN_MS = 1600;
const FADE_OUT_MS = 2600;

function loadInitialPlaying(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(LS_PLAYING) === '1';
  } catch {
    return false;
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function fadeAudio(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
  onDone?: () => void,
) {
  const clampedFrom = Math.max(0, Math.min(1, from));
  audio.volume = clampedFrom;
  const start = performance.now();
  let rafId = 0;
  const tick = (t: number) => {
    const progress = Math.min(1, (t - start) / durationMs);
    const eased = easeInOutCubic(progress);
    audio.volume = Math.max(0, Math.min(1, clampedFrom + (to - clampedFrom) * eased));
    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      audio.volume = Math.max(0, Math.min(1, to));
      onDone?.();
    }
  };
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

export default function FocusAmbientPlayer({
  forcePause = false,
}: {
  /** When true, the player quietly fades out and hides its controls.
   *  Used by the shell to ride the focus window's exit transition. */
  forcePause?: boolean;
}) {
  const [playing, setPlaying] = useState<boolean>(() => loadInitialPlaying());
  const [hovered, setHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_PLAYING, playing ? '1' : '0');
    } catch {
      // non-fatal
    }
  }, [playing]);

  // Effective audio state combines the user's preference with the shell's
  // force-pause signal. We don't mutate `playing` when forcePause flips —
  // that would clobber the user's preference on the next window.
  const shouldPlay = playing && !forcePause;

  // Drive the audio element. Long eased fades in/out so the room warms
  // up and settles rather than clicking on and off.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (shouldPlay) {
      audio.volume = 0;
      const playPromise = audio.play();
      const cancelFade = fadeAudio(audio, 0, 1, FADE_IN_MS);
      // If the browser blocks autoplay (no gesture yet), revert the toggle
      // so the UI matches reality and the user can tap again.
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          cancelFade();
          audio.volume = 1;
          setPlaying(false);
        });
      }
      return cancelFade;
    }

    // Fade out, then pause so the tail doesn't click off.
    const cancelFade = fadeAudio(audio, audio.volume, 0, FADE_OUT_MS, () => {
      audio.pause();
      audio.volume = 1;
    });
    return cancelFade;
  }, [shouldPlay]);

  return (
    <div
      className="fixed bottom-6 right-20 z-40"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-hidden={forcePause || undefined}
      style={{
        opacity: forcePause ? 0 : 1,
        transition: 'opacity 600ms ease',
        pointerEvents: forcePause ? 'none' : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => setPlaying((v) => !v)}
        aria-pressed={playing}
        aria-label={playing ? 'Pause ambient sound' : 'Play ambient sound'}
        disabled={forcePause}
        className="relative inline-flex items-center justify-center rounded-full bg-card-bg/60 backdrop-blur-md hover:bg-card-bg/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ width: ORB_SIZE, height: ORB_SIZE }}
      >
        {playing && (
          <>
            {/* Sound-wave ripples — two rings offset in phase so the orb
                never looks still. They bloom outward from the rim. */}
            <span
              className="absolute rounded-full border border-accent/45 focus-mode-ambient-ripple pointer-events-none"
              style={{ width: ORB_SIZE, height: ORB_SIZE, top: 0, left: 0 }}
              aria-hidden="true"
            />
            <span
              className="absolute rounded-full border border-accent/35 focus-mode-ambient-ripple focus-mode-ambient-ripple-delayed pointer-events-none"
              style={{ width: ORB_SIZE, height: ORB_SIZE, top: 0, left: 0 }}
              aria-hidden="true"
            />
            <span
              className="absolute rounded-full focus-mode-halo-breathe pointer-events-none"
              aria-hidden="true"
              style={{
                width: ORB_SIZE - HALO_INSET,
                height: ORB_SIZE - HALO_INSET,
                top: (ORB_SIZE - (ORB_SIZE - HALO_INSET)) / 2,
                left: (ORB_SIZE - (ORB_SIZE - HALO_INSET)) / 2,
                background:
                  'radial-gradient(circle, rgba(6,182,212,0.55) 0%, rgba(6,182,212,0.25) 45%, rgba(6,182,212,0) 72%)',
              }}
            />
          </>
        )}
        <svg
          width={ORB_SIZE}
          height={ORB_SIZE}
          viewBox={`0 0 ${ORB_SIZE} ${ORB_SIZE}`}
          aria-hidden="true"
          className="relative"
        >
          <circle
            cx={ORB_SIZE / 2}
            cy={ORB_SIZE / 2}
            r={(ORB_SIZE - ORB_STROKE) / 2 - 1}
            fill="none"
            stroke="currentColor"
            strokeWidth={ORB_STROKE}
            className={playing ? 'text-accent/30' : 'text-foreground/12'}
            style={{ transition: 'stroke 300ms ease' }}
          />
        </svg>
        {playing ? (
          <Volume2
            className="absolute inset-0 m-auto w-4 h-4 text-accent"
            aria-hidden="true"
          />
        ) : (
          <VolumeX
            className="absolute inset-0 m-auto w-4 h-4 text-secondary"
            aria-hidden="true"
          />
        )}
      </button>

      <AnimatePresence>
        {hovered && (
          <motion.span
            key="ambient-tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-accent/25 bg-card-bg/95 backdrop-blur-md px-2.5 py-1 shadow-sm text-xs font-medium text-foreground"
          >
            <Volume2 className="w-3 h-3 text-accent/80" aria-hidden="true" />
            <span>{playing ? 'Ambient on · tap to pause' : 'Ambient off · tap to play'}</span>
          </motion.span>
        )}
      </AnimatePresence>

      {/* Audio stays mounted even when paused so play() resumes instantly
          and the browser keeps the source warm. System volume applies. */}
      <audio ref={audioRef} src={AMBIENT_SOUND_URL} loop preload="auto" />
    </div>
  );
}
