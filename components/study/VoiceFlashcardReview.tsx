'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Mic, MicOff, Volume2, VolumeX, ChevronRight, CheckCircle2, Brain, AlertCircle } from 'lucide-react';
import Button from '@/components/Button';
import { Rating } from '@/lib/services/fsrs';
import {
  speak,
  cancelSpeech,
  startContinuousRatingListener,
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
} from '@/lib/services/speechRecognition';
import type { RatingWord } from '@/lib/services/speechRecognition';

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
  const recognitionStopRef = useRef<(() => void) | null>(null);

  const [cards, setCards] = useState<DueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [countdown, setCountdown] = useState(RECALL_PAUSE_SECONDS);
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(isSpeechSynthesisSupported());
  const [voiceEnabled, setVoiceEnabled] = useState(isSpeechRecognitionSupported());
  const [submitError, setSubmitError] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  // Voice confirmation: voice pre-selects a rating; user has VOICE_CONFIRM_SECONDS to cancel
  const [pendingRating, setPendingRating] = useState<RatingWord | null>(null);
  const [pendingCountdown, setPendingCountdown] = useState(VOICE_CONFIRM_SECONDS);

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

  // ── TTS for question phase ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question' || !currentCard) return;
    if (!ttsEnabled) return;

    speak(`Card ${index + 1} of ${cards.length}. ${currentCard.question}`)
      .then(() => setPhase('recall_pause'))
      .catch(() => setPhase('recall_pause'));

    return () => cancelSpeech();
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recall pause countdown ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'recall_pause') return;
    setCountdown(RECALL_PAUSE_SECONDS);

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); setPhase('answer'); return 0; }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // ── TTS for answer phase ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'answer' || !currentCard) return;
    if (!ttsEnabled) { setPhase('rating'); return; }

    speak(`The answer is: ${currentCard.answer}`)
      .then(() => setPhase('rating'))
      .catch(() => setPhase('rating'));

    return () => cancelSpeech();
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Continuous voice recognition — active whenever in rating phase ──────────
  useEffect(() => {
    if (phase !== 'rating' || !voiceEnabled || pendingRating !== null) return;

    // Brief delay so the audio system finishes TTS before the mic opens
    const timer = setTimeout(() => {
      setListening(true);
      recognitionStopRef.current = startContinuousRatingListener((rating) => {
        // Stop listening immediately on match
        recognitionStopRef.current?.();
        recognitionStopRef.current = null;
        setListening(false);
        setPendingCountdown(VOICE_CONFIRM_SECONDS);
        setPendingRating(rating);
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      recognitionStopRef.current?.();
      recognitionStopRef.current = null;
      setListening(false);
    };
  }, [phase, voiceEnabled, pendingRating]);

  const cancelPendingRating = useCallback(() => {
    setPendingRating(null);
    // Recognition restarts automatically — the effect above re-runs when pendingRating → null
  }, []);

  const submitRating = useCallback(async (rating: Rating) => {
    if (!currentCard || phase === 'submitting') return;
    // Stop mic immediately before any state changes
    recognitionStopRef.current?.();
    recognitionStopRef.current = null;
    setPendingRating(null);
    setPhase('submitting');
    setSubmitError(false);
    setListening(false);
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
        if (ttsEnabled) {
          await speak(`Session complete! You reviewed ${newCount} card${newCount !== 1 ? 's' : ''}. Great job!`).catch(() => {});
        }
        setPhase('done');
        onSessionComplete?.(newCount);
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
    recognitionStopRef.current?.();
    recognitionStopRef.current = null;
    cancelSpeech();
    onClose();
  };

  // ── Keyboard shortcuts during rating ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'rating') return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '1') submitRating(Rating.Again);
      if (e.key === '2') submitRating(Rating.Hard);
      if (e.key === '3') submitRating(Rating.Good);
      if (e.key === '4') submitRating(Rating.Easy);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, submitRating]);

  // ── Countdown ring SVG ──────────────────────────────────────────────────────
  const ringR = 28;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (countdown / RECALL_PAUSE_SECONDS) * ringC;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div role="dialog" aria-modal="true" aria-label="Voice Flashcard Review" className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <Brain className="w-10 h-10 text-accent animate-pulse" />
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
          <h2 className="text-2xl font-bold text-foreground mb-2">All caught up!</h2>
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Session Complete</h2>
          <p className="text-muted-foreground mb-6">{reviewedCount} card{reviewedCount !== 1 ? 's' : ''} reviewed</p>
          <Button variant="primary" onClick={onClose} className="w-full">Done</Button>
        </motion.div>
      </div>
    );
  }

  const progress = cards.length > 0 ? ((index + 1) / cards.length) * 100 : 0;

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
          {listening && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400" aria-live="polite" aria-label="Microphone active">
              <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400 animate-pulse shrink-0" aria-hidden="true" />
              Mic on
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* TTS toggle */}
          <button
            onClick={() => { setTtsEnabled((v) => !v); cancelSpeech(); }}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${ttsEnabled ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:bg-muted/20'}`}
            aria-label={ttsEnabled ? 'Mute text-to-speech' : 'Enable text-to-speech'}
            title={ttsEnabled ? 'Mute TTS' : 'Enable TTS'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {/* Voice toggle */}
          {isSpeechRecognitionSupported() && (
            <button
              onClick={() => setVoiceEnabled((v) => !v)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${voiceEnabled ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:bg-muted/20'}`}
              aria-label={voiceEnabled ? 'Disable voice input' : 'Enable voice input'}
              title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Exit review session (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/30 shrink-0" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={cards.length}>
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${progress}%` }}
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
            {/* Question */}
            <div className="bg-card-bg border-2 border-border rounded-2xl p-8 mb-6 min-h-[140px] flex items-center justify-center">
              <p className="text-xl font-medium text-foreground text-center leading-relaxed">
                {currentCard?.question}
              </p>
            </div>

            {/* Recall pause countdown */}
            {phase === 'recall_pause' && (
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="relative" aria-label={`${countdown} seconds to recall`}>
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r={ringR} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
                    <motion.circle
                      cx="36" cy="36" r={ringR}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={ringC}
                      animate={{ strokeDashoffset: ringOffset }}
                      transition={{ duration: 1, ease: 'linear' }}
                      transform="rotate(-90 36 36)"
                      className="text-accent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-foreground tabular-nums">{countdown}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Try to recall the answer...</p>
              </div>
            )}

            {/* Answer reveal */}
            {(phase === 'answer' || phase === 'rating' || phase === 'submitting') && (
              <div className="bg-accent/5 border-2 border-accent/30 rounded-2xl p-6 mb-6">
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

            {/* Voice confirmation banner — shown when voice pre-selects a rating */}
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
                </span>
                <button
                  onClick={cancelPendingRating}
                  className="text-accent hover:text-accent/70 font-semibold cursor-pointer ml-4 shrink-0 min-h-[44px] px-2"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Listening indicator */}
            {listening && !pendingRating && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 mb-4 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm">
                <Mic className="w-4 h-4 animate-pulse" aria-hidden="true" />
                <span>Listening for: Again / Hard / Good / Easy</span>
              </div>
            )}

            {/* Rating buttons */}
            {(phase === 'rating' || phase === 'submitting') && (
              <div>
                <p className="text-sm text-muted-foreground text-center mb-3">
                  How well did you recall?{' '}
                  <span className="opacity-60" aria-hidden="true">(1–4)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {RATING_LABELS.map(({ rating, label, key, color }) => (
                    <button
                      key={rating}
                      onClick={() => submitRating(rating)}
                      disabled={phase === 'submitting'}
                      aria-label={`Rate ${label}. Press ${key}.`}
                      className={`flex flex-col items-center py-3 px-2 border-2 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 bg-card-bg ${color}`}
                    >
                      <span className="font-semibold text-sm">{label}</span>
                      <span className="text-xs opacity-40 mt-0.5" aria-hidden="true">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skip recall (during recall_pause) */}
            {phase === 'recall_pause' && (
              <div className="text-center mt-2">
                <button
                  onClick={() => setPhase('answer')}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer mx-auto transition-colors"
                >
                  Skip pause
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div className="pb-4 text-center shrink-0" aria-hidden="true">
        <p className="text-xs text-muted-foreground">
          {phase === 'rating' ? '1 Again · 2 Hard · 3 Good · 4 Easy · Esc to exit' : 'Esc to exit'}
        </p>
      </div>
    </div>
  );
}
