'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AMBIENT_SOUND_URL } from '@/lib/focus-mode/ambient-tracks';

interface BreathingOverlayProps {
  open: boolean;
  durationMs?: number;
  /** If provided, the overlay treats this as the wall-clock start of a
   *  continuous warm-up session. When the user opens the overlay partway
   *  through the T-5 → T-0 window, it picks up breathing from the current
   *  position (rather than restarting) and auto-completes at sessionStart +
   *  durationMs. If null/undefined, the overlay behaves as a fresh session
   *  that starts the moment it opens. */
  sessionStartAt?: Date | null;
  onClose: () => void;
}

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

interface PhaseFrame {
  key: Phase;
  name: string;
  dur: number;
  from: number;
  to: number;
}

const PHASES: readonly PhaseFrame[] = [
  { key: 'inhale', name: 'Breathe in',  dur: 4000, from: 0, to: 1 },
  { key: 'hold1',  name: 'Hold',        dur: 4000, from: 1, to: 1 },
  { key: 'exhale', name: 'Breathe out', dur: 4000, from: 1, to: 0 },
  { key: 'hold2',  name: 'Hold',        dur: 4000, from: 0, to: 0 },
];
const CYCLE_MS = PHASES.reduce((sum, p) => sum + p.dur, 0);

function phaseAt(cycleT: number): { frame: PhaseFrame; local: number } {
  let acc = 0;
  for (const frame of PHASES) {
    if (cycleT < acc + frame.dur) {
      return { frame, local: (cycleT - acc) / frame.dur };
    }
    acc += frame.dur;
  }
  const last = PHASES[PHASES.length - 1];
  return { frame: last, local: 1 };
}

/** Asymmetric easing: inhale active (inOut quad), exhale passive (eased out). */
function breathEase(t: number, key: Phase): number {
  if (key === 'exhale') return 1 - Math.pow(1 - t, 2.5);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const ACCENT_2 = '#a78bfa';

export default function BreathingOverlay({
  open,
  durationMs = 5 * 60 * 1000,
  sessionStartAt,
  onClose,
}: BreathingOverlayProps) {
  const sessionStartMs = sessionStartAt ? sessionStartAt.getTime() : null;
  const [phase, setPhase] = useState<Phase>('inhale');
  const [sessionProgress, setSessionProgress] = useState(0);
  const [completing, setCompleting] = useState(false);
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const startAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const currentPhaseRef = useRef<Phase>('inhale');
  const onCloseRef = useRef(onClose);
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Clean reset whenever we (re)open.
  useEffect(() => {
    if (!open) return;
    setPhase('inhale');
    currentPhaseRef.current = 'inhale';
    setSessionProgress(0);
    setCompleting(false);
    startAtRef.current = null;
    const el = scopeRef.current;
    if (el) el.style.setProperty('--breath', '0');
  }, [open]);

  // rAF engine — computes breath + phase every frame, but only re-renders React
  // on phase transitions. --breath updates happen imperatively so we avoid
  // a 60fps render loop.
  useEffect(() => {
    if (!open) return;
    // When sessionStartMs is provided, initialize the rAF clock so that
    // elapsed reads as "time since T-5" — overlay picks up from the current
    // breathing position rather than restarting at 0.
    const initClock = (ts: number) => {
      if (sessionStartMs !== null) {
        const offsetMs = Math.max(0, Date.now() - sessionStartMs);
        startAtRef.current = ts - offsetMs;
      } else {
        startAtRef.current = ts;
      }
    };

    if (reducedMotion) {
      // Reduced-motion path: step phases on a plain interval, no scale/rotation.
      initClock(performance.now());
      let idx = 0;
      const tick = () => {
        const elapsed = performance.now() - (startAtRef.current ?? 0);
        const progress = Math.min(1, elapsed / durationMs);
        setSessionProgress(progress);
        if (progress >= 1) {
          setCompleting(true);
          setTimeout(() => onCloseRef.current(), 400);
          return;
        }
        idx = (idx + 1) % PHASES.length;
        const next = PHASES[idx].key;
        currentPhaseRef.current = next;
        setPhase(next);
      };
      tick();
      const interval = setInterval(tick, 4000);
      return () => clearInterval(interval);
    }

    const loop = (ts: number) => {
      if (startAtRef.current === null) initClock(ts);
      const elapsed = ts - (startAtRef.current as number);
      const progress = Math.min(1, elapsed / durationMs);

      const cycleT = elapsed % CYCLE_MS;
      const { frame, local } = phaseAt(cycleT);
      const eased = breathEase(local, frame.key);
      const breath = frame.from + (frame.to - frame.from) * eased;

      const el = scopeRef.current;
      if (el) el.style.setProperty('--breath', breath.toFixed(4));

      if (frame.key !== currentPhaseRef.current) {
        currentPhaseRef.current = frame.key;
        setPhase(frame.key);
      }

      // Only update React state for session progress on full-percent changes to
      // keep the stroke-dashoffset smooth without thrashing React.
      setSessionProgress((prev) => {
        if (Math.abs(progress - prev) > 0.003) return progress;
        return prev;
      });

      if (progress >= 1) {
        setCompleting(true);
        setTimeout(() => onCloseRef.current(), 400);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [open, durationMs, reducedMotion, sessionStartMs]);

  const handleCancel = useCallback(() => {
    onCloseRef.current();
  }, []);

  // Keyboard: Esc cancels.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="breathing-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Pre-session breathing exercise"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-62"
        >
          {/* One consistent dim-the-room backdrop for both themes — meditation
              overlays feel intentional when they darken uniformly, and white
              focal text reads cleanly without a visible radial vignette. */}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[28px]" />
          <div
            ref={scopeRef}
            data-phase={phase}
            data-reduced-motion={reducedMotion ? 'true' : 'false'}
            className="breathing-scope relative flex h-full w-full flex-col items-center justify-center gap-8 px-6 sm:gap-10"
          >
            <div className="halo-stage relative flex items-center justify-center">
              <PetalHalo />
            </div>
            <PhaseLabel phase={phase} completing={completing} />
            <div className="mt-6 flex items-center gap-2">
              <AmbientToggle overlayOpen={open} />
              <button
                type="button"
                onClick={handleCancel}
                className="breathing-cancel cursor-pointer rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition-colors hover:border-white/25 hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="End breathing exercise early"
              >
                End early
              </button>
            </div>
            <TimeRemaining progress={sessionProgress} durationMs={durationMs} completing={completing} />
            <SessionHairline progress={sessionProgress} />
          </div>

          <style jsx>{`
            .breathing-scope {
              --breath: 0;
            }
            :global(.breathing-scope .halo-stage) {
              width: 240px;
              height: 240px;
            }
            @media (min-width: 768px) {
              :global(.breathing-scope .halo-stage) {
                width: 320px;
                height: 320px;
              }
            }
            /* Petal halo — continuous 60s rotation, never reset on phase change. */
            :global(.breathing-scope .petal-halo) {
              position: relative;
              width: 240px;
              height: 240px;
              animation: petal-rotate 60s linear infinite;
            }
            @media (min-width: 768px) {
              :global(.breathing-scope .petal-halo) {
                width: 320px;
                height: 320px;
              }
            }
            @keyframes petal-rotate {
              to {
                transform: rotate(360deg);
              }
            }
            :global(.breathing-scope[data-reduced-motion='true'] .petal-halo) {
              animation: none;
            }
            :global(.breathing-scope .petal) {
              position: absolute;
              top: 50%;
              left: 50%;
              width: 58%;
              height: 58%;
              margin-top: -29%;
              margin-left: -29%;
              border-radius: 50%;
              background: radial-gradient(
                circle at 40% 40%,
                color-mix(in srgb, var(--accent) 77%, transparent),
                transparent 66%
              );
              mix-blend-mode: screen;
              /* Everything drives off --breath (0..1, rAF-updated every frame
                 with asymmetric easing in JS). Blur, opacity, saturation, and
                 outward translate all vary continuously — no phase-switched
                 CSS rules, so no abrupt jumps at phase boundaries. */
              opacity: calc(0.9 + var(--breath) * 0.1);
              filter: blur(calc(5px + (1 - var(--breath)) * 2px))
                saturate(calc(1 + var(--breath) * 0.2));
              transform: rotate(var(--r)) translateY(calc(-60px - var(--breath) * 40px));
            }
            :global(.breathing-scope .petal:nth-child(odd)) {
              background: radial-gradient(
                circle at 40% 40%,
                color-mix(in srgb, ${ACCENT_2} 77%, transparent),
                transparent 66%
              );
            }
            :global(.breathing-scope .petal:nth-child(1)) { --r: 0deg; }
            :global(.breathing-scope .petal:nth-child(2)) { --r: 60deg; }
            :global(.breathing-scope .petal:nth-child(3)) { --r: 120deg; }
            :global(.breathing-scope .petal:nth-child(4)) { --r: 180deg; }
            :global(.breathing-scope .petal:nth-child(5)) { --r: 240deg; }
            :global(.breathing-scope .petal:nth-child(6)) { --r: 300deg; }
            :global(.breathing-scope[data-reduced-motion='true'] .petal) {
              opacity: 0.85;
              filter: blur(8px);
              transition: opacity 400ms ease, transform 400ms ease;
            }
            /* Light mode: 'screen' desaturates petals into white. Switch to
               'normal' and crank density + saturation so petals read as
               solid but still soft colored orbs against the light backdrop. */
            :global(html.light .breathing-scope .petal) {
              mix-blend-mode: normal;
              background: radial-gradient(
                circle at 40% 40%,
                color-mix(in srgb, var(--accent) 95%, transparent),
                transparent 70%
              );
              opacity: calc(0.86 + var(--breath) * 0.12);
              filter: blur(calc(5px + (1 - var(--breath)) * 2px))
                saturate(calc(1.1 + var(--breath) * 0.2));
            }
            :global(html.light .breathing-scope .petal:nth-child(odd)) {
              background: radial-gradient(
                circle at 40% 40%,
                color-mix(in srgb, ${ACCENT_2} 95%, transparent),
                transparent 70%
              );
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PetalHalo() {
  return (
    <div className="petal-halo">
      <div className="petal" />
      <div className="petal" />
      <div className="petal" />
      <div className="petal" />
      <div className="petal" />
      <div className="petal" />
    </div>
  );
}

function PhaseLabel({ phase, completing }: { phase: Phase; completing: boolean }) {
  const label = completing
    ? "You're ready."
    : phase === 'inhale'
    ? 'Breathe in'
    : phase === 'exhale'
    ? 'Breathe out'
    : 'Hold';
  const key = completing ? 'done' : phase;
  return (
    <div className="relative h-8 text-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-lg font-medium text-white"
          style={{ letterSpacing: '0.02em' }}
        >
          {label}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/**
 * A quiet numeric countdown ("4:32") shown below the cancel button. Small,
 * dimmed, Geist Medium — there if the user glances down, invisible otherwise.
 * Paired with the baseline hairline, gives two levels of "how much longer"
 * without putting a clock in the focal area.
 */
function TimeRemaining({
  progress,
  durationMs,
  completing,
}: {
  progress: number;
  durationMs: number;
  completing: boolean;
}) {
  if (completing) return null;
  const remainingMs = Math.max(0, Math.round(durationMs * (1 - progress)));
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const label = `${m}:${s.toString().padStart(2, '0')}`;
  return (
    <p
      aria-live="off"
      className="mt-1 text-sm font-medium tabular-nums text-white/45"
    >
      {label}
    </p>
  );
}

/**
 * Small circular ambient-sound toggle inside the overlay. Default OFF (no
 * audio surprises on first open); preference persists via localStorage.
 *
 * Fade shape matches `FocusAmbientPlayer` so the two players feel like
 * siblings:
 *   - FADE_IN_MS: user presses play → room warms up gradually.
 *   - FADE_OUT_MS_USER: user presses pause → stop right away. A tiny ramp
 *     (~70ms) only to avoid a DAC click, otherwise it reads as instant.
 *   - FADE_OUT_MS_CLOSE: the overlay itself is closing → medium ease so the
 *     sound leaves on the same clock as the visual fade-out (~500ms).
 *
 * Uses the same white-noise track as focus-mode's ambient player, but keeps
 * its own localStorage key + audio element so breathing-session sound is
 * independent of the focus-window player.
 */
const AMBIENT_LS_KEY = 'focus-mode:breathing:sound:enabled';
const AMBIENT_FADE_IN_MS = 1600;
const AMBIENT_FADE_OUT_MS_USER = 70;
const AMBIENT_FADE_OUT_MS_CLOSE = 400;
const AMBIENT_VOLUME = 0.6;

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

function AmbientToggle({ overlayOpen }: { overlayOpen: boolean }) {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(AMBIENT_LS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(AMBIENT_LS_KEY, on ? '1' : '0');
    } catch {
      // non-fatal
    }
  }, [on]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Overlay is closing — ease audio down to silence on the same clock as
    // the visual fade-out. Do NOT mutate `on`: we want the user's preference
    // preserved for the next time they open the overlay.
    if (!overlayOpen) {
      return fadeAudio(audio, audio.volume, 0, AMBIENT_FADE_OUT_MS_CLOSE, () => {
        audio.pause();
      });
    }

    if (on) {
      audio.volume = 0;
      const playPromise = audio.play();
      const cancelFade = fadeAudio(audio, 0, AMBIENT_VOLUME, AMBIENT_FADE_IN_MS);
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay blocked — revert the toggle so UI matches reality.
          cancelFade();
          audio.volume = AMBIENT_VOLUME;
          setOn(false);
        });
      }
      return cancelFade;
    }

    return fadeAudio(audio, audio.volume, 0, AMBIENT_FADE_OUT_MS_USER, () => {
      audio.pause();
    });
  }, [on, overlayOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        aria-label={on ? 'Pause ambient sound' : 'Play ambient sound'}
        title={on ? 'Ambient sound on' : 'Ambient sound off'}
        className="group inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        {on ? (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <audio ref={audioRef} src={AMBIENT_SOUND_URL} loop preload="auto" />
    </div>
  );
}

/**
 * Baseline progress hairline at the bottom of the overlay. 2px track, accent
 * fill — visible enough to read as a timeline, subtle enough to stay out of
 * focal attention during the meditation.
 */
function SessionHairline({ progress }: { progress: number }) {
  const pct = Math.min(1, Math.max(0, progress)) * 100;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-full bg-white/10"
    >
      <div
        className="h-full bg-accent/60"
        style={{
          width: `${pct}%`,
          transition: 'width 200ms linear',
        }}
      />
    </div>
  );
}
