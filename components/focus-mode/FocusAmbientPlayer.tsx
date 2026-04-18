'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { AMBIENT_SOUND_URL } from '@/lib/focus-mode/ambient-tracks';

const LS_PLAYING = 'focus-mode:ambient:playing';
const AMBIENT_CHANNEL = 'focus-mode:ambient-lock';

// Match the focus orb geometry so the two buttons read as siblings.
const ORB_SIZE = 46;
const ORB_STROKE = 3.5;
const HALO_INSET = 18;

// Fade shapes:
// - FADE_IN_MS: user presses play → room warms up gradually.
// - FADE_OUT_MS_USER: user presses pause → stop right away. A tiny ramp
//   (~70ms) only to avoid a DAC click, otherwise it reads as instant.
// - FADE_OUT_MS_FORCE: the shell force-pauses at window close → long ease
//   matched to the ~3s horizon-dissolve (Common Fate — sound and orb leave
//   on the same clock).
const FADE_IN_MS = 1600;
const FADE_OUT_MS_USER = 70;
const FADE_OUT_MS_FORCE = 2600;

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
  // True when another tab is actively playing ambient. We stay silent
  // until the user explicitly takes over in this tab (clicks play here).
  // Prevents duplicated sound when a link opens with target="_blank".
  const [remoteActive, setRemoteActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [tabId] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_PLAYING, playing ? '1' : '0');
    } catch {
      // non-fatal
    }
  }, [playing]);

  // Effective audio state combines the user's preference with the shell's
  // force-pause signal AND the cross-tab lock. We don't mutate `playing`
  // when forcePause or remoteActive flips — that would clobber the user's
  // preference on the next window / next tab swap.
  const shouldPlay = playing && !forcePause && !remoteActive;

  // Keep a ref in sync so cross-tab message handlers can read latest
  // intent without closure staleness.
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  const forcePauseRef = useRef(forcePause);
  useEffect(() => {
    forcePauseRef.current = forcePause;
  }, [forcePause]);

  // Set up the BroadcastChannel once. Messages coordinate a single active
  // player across tabs:
  //   - `ping`    — a newly-mounted tab asking "is anyone playing?"
  //   - `claim`   — this tab is now playing; others should go silent
  //   - `release` — this tab stopped; others do NOT auto-resume (we don't
  //                 want closing one tab to suddenly unmute a background
  //                 tab the user had deferred)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const ch = new BroadcastChannel(AMBIENT_CHANNEL);
    channelRef.current = ch;
    const myId = tabId;

    const onMessage = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object' || msg.tabId === myId) return;
      if (msg.type === 'claim') {
        setRemoteActive(true);
      } else if (msg.type === 'release') {
        // Someone let go — but we stay silent until the user clicks here.
      } else if (msg.type === 'ping') {
        // A new tab is asking. If we're the active player, reassert so
        // the new tab knows to defer.
        if (playingRef.current && !forcePauseRef.current) {
          ch.postMessage({ type: 'claim', tabId: myId });
        }
      }
    };
    ch.addEventListener('message', onMessage);

    // Announce ourselves so any existing player can reassert its claim.
    // If nobody responds within the fade-in's near-silent ramp (~50ms of
    // audio is inaudible at cubic ease-in volume), we end up playing.
    ch.postMessage({ type: 'ping', tabId: myId });

    const onPageHide = () => {
      try {
        ch.postMessage({ type: 'release', tabId: myId });
      } catch {
        // channel already closing — ignore
      }
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      try {
        ch.postMessage({ type: 'release', tabId: myId });
      } catch {
        // ignore
      }
      ch.removeEventListener('message', onMessage);
      ch.close();
      channelRef.current = null;
    };
  }, [tabId]);

  // Broadcast claim/release when our effective-play intent flips, but NOT
  // on initial mount — the mount-time `ping` is the way we learn whether
  // another tab is playing, and we don't want a stale localStorage pref to
  // kick an already-playing tab off its claim.
  const firstBroadcastRef = useRef(true);
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;
    if (firstBroadcastRef.current) {
      firstBroadcastRef.current = false;
      return;
    }
    const myId = tabId;
    if (playing && !forcePause && !remoteActive) {
      ch.postMessage({ type: 'claim', tabId: myId });
    } else if (!playing) {
      ch.postMessage({ type: 'release', tabId: myId });
    }
  }, [playing, forcePause, remoteActive, tabId]);

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

    // Fade out, then pause so the tail doesn't click off. Long fade only
    // when the shell force-pauses at window close; user-initiated pauses
    // stop as close to immediately as a click-free ramp allows.
    const fadeMs = forcePause ? FADE_OUT_MS_FORCE : FADE_OUT_MS_USER;
    const cancelFade = fadeAudio(audio, audio.volume, 0, fadeMs, () => {
      audio.pause();
      audio.volume = 1;
    });
    return cancelFade;
  }, [shouldPlay, forcePause]);

  return (
    <div
      className="relative"
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
        onClick={() => {
          // Any click in this tab is an explicit take-over: clear the
          // deferred state and toggle our local play intent.
          setRemoteActive(false);
          if (shouldPlay) {
            setPlaying(false);
          } else {
            setPlaying(true);
          }
        }}
        aria-pressed={shouldPlay}
        aria-label={shouldPlay ? 'Pause ambient sound' : 'Play ambient sound'}
        disabled={forcePause}
        className="relative inline-flex items-center justify-center rounded-full bg-card-bg/60 backdrop-blur-md hover:bg-card-bg/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ width: ORB_SIZE, height: ORB_SIZE }}
      >
        {shouldPlay && (
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
            className={shouldPlay ? 'text-accent/30' : 'text-foreground/12'}
            style={{ transition: 'stroke 300ms ease' }}
          />
        </svg>
        {shouldPlay ? (
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
            <span>
              {shouldPlay
                ? 'Ambient on · tap to pause'
                : remoteActive
                ? 'Playing in another tab · tap to move here'
                : 'Ambient off · tap to play'}
            </span>
          </motion.span>
        )}
      </AnimatePresence>

      {/* Audio stays mounted even when paused so play() resumes instantly
          and the browser keeps the source warm. System volume applies. */}
      <audio ref={audioRef} src={AMBIENT_SOUND_URL} loop preload="auto" />
    </div>
  );
}
