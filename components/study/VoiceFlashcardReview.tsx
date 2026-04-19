'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Mic, MicOff, Volume2, VolumeX, ChevronRight, CheckCircle2, Brain, AlertCircle, Plus } from 'lucide-react';
import Button from '@/components/Button';
import { Rating } from '@/lib/services/fsrs';
import { speak, cancelSpeech, matchRating } from '@/lib/services/voice';
import type { RatingWord } from '@/lib/services/voice';
import { hasMediaDevices } from '@/lib/utils/media';

interface DueCard {
  _id: string;
  question: string;
  answer: string;
  fsrs: object;
}

type Phase = 'loading' | 'error' | 'no_cards' | 'question' | 'recall_pause' | 'answer' | 'rating' | 'submitting' | 'done';

const WORD_TO_RATING: Record<RatingWord, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const RATING_WORD: Record<RatingWord, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

const RECALL_PAUSE_SECONDS = 5;
const VOICE_CONFIRM_SECONDS = 2;

const RATING_LABELS = [
  { rating: Rating.Again, label: 'Again', key: '1', color: 'border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30' },
  { rating: Rating.Hard,  label: 'Hard',  key: '2', color: 'border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30' },
  { rating: Rating.Good,  label: 'Good',  key: '3', color: 'border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30' },
  { rating: Rating.Easy,  label: 'Easy',  key: '4', color: 'border-accent text-accent hover:bg-accent/10' },
];

interface Props {
  onClose: () => void;
  onSessionComplete?: (total: number) => void;
}

export default function VoiceFlashcardReview({ onClose, onSessionComplete }: Props) {
  const shouldReduceMotion = useReducedMotion();
  const triggerRef = useRef<Element | null>(null);

  // Audio refs
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const phaseRef = useRef<Phase>('loading');
  const voiceHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cards, setCards] = useState<DueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [countdown, setCountdown] = useState(RECALL_PAUSE_SECONDS);
  const [totalPause, setTotalPause] = useState(RECALL_PAUSE_SECONDS);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [submitError, setSubmitError] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [slowProcessing, setSlowProcessing] = useState(false);
  const [pendingRating, setPendingRating] = useState<RatingWord | null>(null);
  const [pendingCountdown, setPendingCountdown] = useState(VOICE_CONFIRM_SECONDS);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Restore focus on close
  useEffect(() => {
    triggerRef.current = document.activeElement;
    return () => { (triggerRef.current as HTMLElement | null)?.focus(); };
  }, []);

  // Escape to exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load due cards
  const loadCards = useCallback(() => {
    setPhase('loading');
    fetch('/api/flashcards/due')
      .then((r) => r.json())
      .then((data) => {
        const due = (data.dueCards ?? []).slice(0, 30);
        setCards(due);
        setPhase(due.length > 0 ? 'question' : 'no_cards');
      })
      .catch(() => setPhase('error'));
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  const currentCard = cards[index];

  // ── Open mic stream once when voiceEnabled ──────────────────────────────────
  useEffect(() => {
    if (!voiceEnabled) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setMicReady(false);
      return;
    }

    let cancelled = false;
    if (!hasMediaDevices()) {
      setMicError(true);
      setVoiceEnabled(false);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        setMicReady(true);
        setMicError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setMicError(true);
          setVoiceEnabled(false);
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setMicReady(false);
    };
  }, [voiceEnabled]);

  // ── TTS for question phase — only advance if speech completed naturally ──────
  useEffect(() => {
    if (phase !== 'question' || !currentCard) return;
    if (!ttsEnabled) { setPhase('recall_pause'); return; }

    speak(`Card ${index + 1} of ${cards.length}. ${currentCard.question}`)
      .then(({ cancelled }) => { if (!cancelled) setPhase('recall_pause'); })
      .catch(() => setPhase('recall_pause'));

    return () => cancelSpeech();
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recall pause countdown ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'recall_pause') return;
    setCountdown(RECALL_PAUSE_SECONDS);
    setTotalPause(RECALL_PAUSE_SECONDS);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); setPhase('answer'); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // ── TTS for answer phase — only advance if speech completed naturally ────────
  useEffect(() => {
    if (phase !== 'answer' || !currentCard) return;
    if (!ttsEnabled) { setPhase('rating'); return; }

    speak(`The answer is: ${currentCard.answer}`)
      .then(({ cancelled }) => { if (!cancelled) setPhase('rating'); })
      .catch(() => setPhase('rating'));

    return () => cancelSpeech();
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Show voice hint with auto-clear ─────────────────────────────────────────
  const showVoiceHint = useCallback((hint: string) => {
    if (voiceHintTimerRef.current) clearTimeout(voiceHintTimerRef.current);
    setVoiceHint(hint);
    voiceHintTimerRef.current = setTimeout(() => setVoiceHint(null), 3500);
  }, []);

  // ── Send recorded audio to Groq Whisper ─────────────────────────────────────
  const sendAudio = useCallback(async () => {
    const mimeType = mediaRecorderRef.current?.mimeType ?? 'audio/webm';
    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];

    if (blob.size < 500) {
      showVoiceHint('Hold longer and speak clearly');
      return;
    }

    setProcessing(true);
    slowTimerRef.current = setTimeout(() => setSlowProcessing(true), 3000);

    try {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      const res = await fetch('/api/voice/stt', { method: 'POST', body: form });

      if (!res.ok) {
        showVoiceHint("Couldn't reach voice service — use the buttons below");
        return;
      }
      if (phaseRef.current !== 'rating') return;

      const { text } = await res.json() as { text?: string };
      const rating = matchRating(text ?? '');

      if (rating && phaseRef.current === 'rating') {
        setPendingRating(rating);
      } else if (text) {
        showVoiceHint(`Heard "${text.trim()}" — say Again, Hard, Good, or Easy`);
      } else {
        showVoiceHint('No speech detected — try again');
      }
    } catch {
      showVoiceHint("Couldn't reach voice service — use the buttons below");
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setSlowProcessing(false);
      setProcessing(false);
    }
  }, [showVoiceHint]);

  // ── Start / stop recording ──────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!streamRef.current || recording) return;
    setVoiceHint(null);
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';
    try {
      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = sendAudio;
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      // MediaRecorder not available
    }
  }, [recording, sendAudio]);

  const stopRecordingAndSend = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    setRecording(false);
  }, []);

  // ── Voice confirmation: countdown timer ─────────────────────────────────────
  useEffect(() => {
    if (!pendingRating) return;
    setPendingCountdown(VOICE_CONFIRM_SECONDS);
    const interval = setInterval(() => {
      setPendingCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingRating]);

  // ── Voice confirmation: auto-submit when countdown reaches zero ─────────────
  useEffect(() => {
    if (pendingCountdown === 0 && pendingRating !== null) {
      const word = pendingRating;
      setPendingRating(null);
      submitRating(WORD_TO_RATING[word]);
    }
  }, [pendingCountdown, pendingRating]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelPendingRating = useCallback(() => {
    setPendingRating(null);
  }, []);

  const submitRating = useCallback(async (rating: Rating) => {
    if (!currentCard || phase === 'submitting') return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setRecording(false);
    setProcessing(false);
    setSlowProcessing(false);
    setVoiceHint(null);
    setPendingRating(null);
    setPhase('submitting');
    setSubmitError(false);
    cancelSpeech();

    try {
      const res = await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcardId: currentCard._id, rating }),
      });
      if (!res.ok) throw new Error('Review failed');

      const newCount = reviewedCount + 1;
      setReviewedCount(newCount);

      if (index + 1 >= cards.length) {
        // Fix #10: show done screen immediately, speak over it (no await)
        setPhase('done');
        onSessionComplete?.(newCount);
        if (ttsEnabled) {
          speak(`Session complete! You reviewed ${newCount} card${newCount !== 1 ? 's' : ''}. Great job!`).catch(() => {});
        }
      } else {
        setIndex((i) => i + 1);
        setPhase('question');
      }
    } catch {
      setSubmitError(true);
      setPhase('rating');
    }
  }, [currentCard, phase, index, cards.length, reviewedCount, ttsEnabled, onSessionComplete]);

  const handleClose = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    if (voiceHintTimerRef.current) clearTimeout(voiceHintTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelSpeech();
    onClose();
  };

  // ── Keyboard shortcuts: 1-4 + Space PTT during rating AND answer phases ─────
  useEffect(() => {
    if (phase !== 'rating' && phase !== 'answer') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Fix #5: guard buttons too so Space on a focused button doesn't double-fire
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;

      if (phase === 'rating') {
        if (e.key === '1') { submitRating(Rating.Again); return; }
        if (e.key === '2') { submitRating(Rating.Hard); return; }
        if (e.key === '3') { submitRating(Rating.Good); return; }
        if (e.key === '4') { submitRating(Rating.Easy); return; }
      }

      // Fix #8: Space PTT works in answer phase too — cancels TTS and starts recording
      if (e.code === 'Space' && !e.repeat && voiceEnabled && micReady && !recording && pendingRating === null) {
        e.preventDefault();
        if (phase === 'answer') {
          cancelSpeech();
          setPhase('rating');
        }
        startRecording();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && recording) {
        e.preventDefault();
        stopRecordingAndSend();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase, voiceEnabled, micReady, recording, pendingRating, submitRating, startRecording, stopRecordingAndSend]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div role="dialog" aria-modal="true" aria-label="Voice Flashcard Review" className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Outer spinning ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent/20 border-t-accent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
          {/* Inner breathing icon */}
          <motion.div
            animate={{ scale: [0.92, 1.04, 0.92], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Brain className="w-7 h-7 text-accent" />
          </motion.div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-sm text-muted-foreground"
        >
          Loading cards...
        </motion.p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div role="dialog" aria-modal="true" aria-label="Voice Flashcard Review" className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card-bg border border-border rounded-2xl p-10 max-w-sm w-full text-center shadow-xl"
        >
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Couldn&apos;t load cards</h2>
          <p className="text-muted-foreground mb-6">Check your connection and try again.</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={loadCards} className="flex-1">Retry</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === 'no_cards') {
    return (
      <div role="dialog" aria-modal="true" aria-label="Voice Flashcard Review" className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card-bg border border-border rounded-2xl p-10 max-w-sm w-full text-center shadow-xl"
        >
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">All caught up!</h2>
          <p className="text-muted-foreground mb-6">No cards are due for voice review right now.</p>
          <Button variant="primary" onClick={onClose}>Close</Button>
        </motion.div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div role="dialog" aria-modal="true" aria-label="Voice Flashcard Review" className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card-bg border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-xl"
        >
          <CheckCircle2 className="w-14 h-14 text-accent mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Session Complete</h2>
          <p className="text-muted-foreground mb-6">{reviewedCount} card{reviewedCount !== 1 ? 's' : ''} reviewed</p>
          <Button variant="primary" onClick={onClose} className="w-full">Done</Button>
        </motion.div>
      </div>
    );
  }

  const progress = cards.length > 0 ? ((index + 1) / cards.length) * 100 : 0;
  const showVoiceControls = (phase === 'rating') && voiceEnabled && micReady && !pendingRating;
  const recallBarPct = totalPause > 0 ? (countdown / totalPause) * 100 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice Flashcard Review"
      className="fixed inset-0 z-50 bg-background/97 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-accent" aria-hidden="true" />
          <span className="font-semibold text-foreground">Voice Review</span>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {index + 1} / {cards.length}
          </span>
          {recording && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400" aria-live="polite" aria-label="Microphone recording">
              <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400 animate-pulse shrink-0" aria-hidden="true" />
              Recording
            </span>
          )}
          {micError && (
            <span className="text-xs font-medium text-amber-500 dark:text-amber-400" aria-live="assertive">
              Mic blocked
            </span>
          )}
        </div>
        {/* Fix #3: bumped to p-2.5 (44px targets), close visually separated */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setTtsEnabled((v) => !v); cancelSpeech(); }}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${ttsEnabled ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:bg-muted/20'}`}
            aria-label={ttsEnabled ? 'Mute text-to-speech' : 'Enable text-to-speech'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setVoiceEnabled((v) => !v)}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${voiceEnabled ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:bg-muted/20'}`}
            aria-label={voiceEnabled ? 'Disable voice input' : 'Enable voice input'}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          {/* Separator before close */}
          <div className="w-px h-5 bg-border mx-2" aria-hidden="true" />
          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Exit review session (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/30 shrink-0 overflow-hidden" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={cards.length}>
        <motion.div
          className="h-full w-full bg-accent origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {/* Question card */}
            <div className="bg-card-bg border-2 border-border rounded-2xl mb-3 min-h-[140px] flex flex-col">
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-xl font-medium text-foreground text-center leading-relaxed">
                  {currentCard?.question}
                </p>
              </div>
              {/* Centered pill bar — recall countdown */}
              {phase === 'recall_pause' && (
                <div className="flex justify-center pb-5" role="timer" aria-label={`${countdown} seconds to recall`}>
                  <div className="w-20 h-[3px] rounded-full bg-muted/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${recallBarPct}%`, transition: 'width 1s linear' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fix #6 + #12: recall controls row — hint text, countdown number, +5s, skip */}
            {phase === 'recall_pause' && (
              <div className="flex items-center justify-between mb-4 px-1">
                <p className="text-xs text-muted-foreground/60">
                  Try to recall the answer...{' '}
                  <span className="tabular-nums">{countdown}s</span>
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCountdown((c) => c + 5);
                      setTotalPause((t) => t + 5);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-accent/5 cursor-pointer transition-all duration-150"
                    aria-label="Add 5 more seconds to recall"
                  >
                    <Plus className="w-3 h-3" />
                    5s
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase('answer')}
                    className="flex items-center gap-0.5 text-xs text-muted-foreground/60 hover:text-muted-foreground cursor-pointer transition-colors"
                  >
                    Skip
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Answer reveal */}
            {(phase === 'answer' || phase === 'rating' || phase === 'submitting') && (
              <div className="bg-accent/5 border-2 border-accent/30 rounded-2xl p-6 mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Answer</p>
                <p className="text-lg text-foreground leading-relaxed">{currentCard?.answer}</p>
              </div>
            )}

            {/* Submit error */}
            {submitError && (
              <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                Review didn&apos;t save. Please try again.
              </div>
            )}

            {/* Mic permission blocked */}
            {micError && (
              <div className="flex flex-col gap-1 px-4 py-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Microphone access blocked — use the buttons below
                </div>
                <p className="text-xs opacity-80 ml-6">
                  Fix: <strong>System Settings → Privacy &amp; Security → Microphone</strong> → allow your browser, then reload.
                </p>
              </div>
            )}

            {/* Voice confirmation banner — Fix #7: hint that rating buttons correct it */}
            {pendingRating && (
              <div
                className="flex items-center justify-between px-4 py-3 mb-4 rounded-xl bg-accent/10 border border-accent/30 text-sm"
                role="status"
                aria-live="polite"
              >
                <span className="text-foreground">
                  <span className="text-muted-foreground">Heard: </span>
                  <span className="font-semibold">{RATING_WORD[pendingRating]}</span>
                  <span className="text-muted-foreground"> — submitting in {pendingCountdown}s</span>
                  <span className="text-muted-foreground/60 text-xs block mt-0.5">Tap a button below to correct</span>
                </span>
                <button
                  type="button"
                  onClick={cancelPendingRating}
                  className="text-accent hover:text-accent/70 font-semibold cursor-pointer ml-4 shrink-0 min-h-[44px] px-2"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Push-to-talk status + hold button */}
            {(phase === 'rating' || phase === 'submitting') && voiceEnabled && micReady && !pendingRating && (
              <div className="flex flex-col items-center gap-3 mb-4">
                {/* Fix #4: animated processing dots + slow-processing fallback message */}
                <div className="text-sm text-center h-5" aria-live="polite">
                  {recording ? (
                    <span className="flex items-center justify-center gap-1.5 text-red-500 dark:text-red-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" aria-hidden="true" />
                      Recording... release to send
                    </span>
                  ) : processing ? (
                    <span className="text-muted-foreground">
                      {slowProcessing ? "Taking longer than usual — or use the buttons" : (
                        <>
                          Processing
                          <motion.span
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                          >...</motion.span>
                        </>
                      )}
                    </span>
                  ) : voiceHint ? (
                    <span className="text-amber-600 dark:text-amber-400">{voiceHint}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      Hold <kbd className="px-1.5 py-0.5 rounded bg-muted/40 border border-border text-xs font-mono">Space</kbd> to speak
                    </span>
                  )}
                </div>

                {/* Mobile hold button */}
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); if (showVoiceControls && !processing) startRecording(); }}
                  onPointerUp={() => { if (recording) stopRecordingAndSend(); }}
                  onPointerLeave={() => { if (recording) stopRecordingAndSend(); }}
                  disabled={phase === 'submitting' || processing || !micReady}
                  aria-label={recording ? 'Release to send' : 'Hold to speak (or hold Space)'}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full border-2 transition-all duration-150 cursor-pointer select-none touch-none disabled:opacity-40 ${
                    recording
                      ? 'border-red-500 bg-red-500/10 text-red-500 dark:text-red-400 scale-95'
                      : 'border-accent/50 text-accent hover:bg-accent/10 hover:border-accent'
                  }`}
                >
                  <Mic className={`w-4 h-4 ${recording ? 'animate-pulse' : ''}`} aria-hidden="true" />
                  <span className="text-sm font-medium">{recording ? 'Recording...' : 'Hold to Speak'}</span>
                </button>
              </div>
            )}

            {/* Rating buttons — Fix #5: added type="button", key indicator opacity bumped */}
            {(phase === 'rating' || phase === 'submitting') && (
              <div>
                <p className="text-sm text-muted-foreground text-center mb-3">
                  How well did you recall?{' '}
                  <span className="opacity-60" aria-hidden="true">(1–4)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {RATING_LABELS.map(({ rating, label, key, color }) => (
                    <button
                      type="button"
                      key={rating}
                      onClick={() => submitRating(rating)}
                      disabled={phase === 'submitting'}
                      aria-label={`Rate ${label}. Press ${key}.`}
                      className={`flex flex-col items-center py-3 px-2 border-2 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 bg-card-bg ${color}`}
                    >
                      <span className="font-semibold text-sm">{label}</span>
                      <span className="text-xs opacity-60 mt-0.5" aria-hidden="true">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fix #11: removed aria-hidden so Space shortcut is discoverable by screen readers */}
      <div className="pb-4 text-center shrink-0">
        <p className="text-xs text-muted-foreground">
          {phase === 'rating'
            ? voiceEnabled && micReady
              ? 'Hold Space · 1 Again · 2 Hard · 3 Good · 4 Easy · Esc to exit'
              : '1 Again · 2 Hard · 3 Good · 4 Easy · Esc to exit'
            : 'Esc to exit'}
        </p>
      </div>
    </div>
  );
}
