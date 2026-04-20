/**
 * Centralized rate limits and input size caps.
 * Edit this single file to tune any limit across the app.
 *
 * Set UNLIMITED_MODE=true in .env to bypass all rate limits and input caps
 * (useful for development, demos, or admin/premium overrides).
 */

// ── Master switch ────────────────────────────────────────────────────────────

export const UNLIMITED =
  process.env.UNLIMITED_MODE === 'true' && process.env.NODE_ENV !== 'production';

// ── Rate Limits ──────────────────────────────────────────────────────────────
// Format: { max: requests allowed, windowSec: sliding window in seconds }

export const RATE_LIMITS = {
  /** Clara chatbot — daily + burst */
  chatbot: {
    daily:  { max: 20,  windowSec: 86_400 },    // 20 messages / 24 hours
    burst:  { max: 10,  windowSec: 60 },         // 10 messages / minute
  },
  /** Text-to-speech (Groq API call per request) */
  tts:     { max: 30,  windowSec: 600 },         // 30 requests / 10 minutes
  /** Speech-to-text (Groq API call per request) */
  stt:     { max: 30,  windowSec: 600 },         // 30 requests / 10 minutes
  /** Video / source processing pipeline (triggers background job) */
  process: { max: 10,  windowSec: 3_600 },       // 10 requests / hour
} as const;

// ── Input Size Caps ──────────────────────────────────────────────────────────

export const INPUT_LIMITS = {
  /** Max characters in a single chatbot message */
  chatMessageLength:  UNLIMITED ? Infinity : 4_000,
  /** Max characters sent to TTS for speech synthesis */
  ttsTextLength:      UNLIMITED ? Infinity : 5_000,
  /** Max audio file size for STT upload (bytes) */
  sttAudioBytes:      UNLIMITED ? Infinity : 10 * 1024 * 1024,   // 10 MB
  /** Max source content chars sent to LLM context */
  sourceContentChars: UNLIMITED ? Infinity : 30_000,              // ~7.5k tokens
} as const;

// ── Clarity Mode (during-window pack) ────────────────────────────────────────
// Knobs for the Echo (T-3 question + next-open answer), Pause Budget, and
// Clara Context Injection phase boundaries. All magic numbers live here so
// the feature code stays tunable from one place.

export const CLARITY_MODE = {
  echo: {
    maxQuestionChars: 200,
    maxAnswerChars: 1000,
    pendingTtlHours: 48,
    draftAssistPerSession: 3,
    /** When to surface the Echo prompt, in minutes before windowEnd. */
    promptMinutesBeforeEnd: 3,
  },
  pause: {
    budgetFloorMinutes: 2,
    budgetCeilingMinutes: 10,
    /** 1 minute of pause budget per 15 minutes of window length. */
    budgetPerWindowMinute: 1 / 15,
  },
  clara: {
    phaseOpeningCutoff: 0.25,
    phaseClosingCutoff: 0.75,
  },
} as const;
