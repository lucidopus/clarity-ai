/**
 * Voice service for voice flashcard review.
 * TTS: Groq Orpheus (Hannah voice) via /api/voice/tts, with browser SpeechSynthesis fallback.
 * STT: push-to-talk via getUserMedia + MediaRecorder → /api/voice/stt (Groq Whisper).
 */

export type RatingWord = 'again' | 'hard' | 'good' | 'easy';

const RATING_KEYWORDS: Record<RatingWord, string[]> = {
  again: ['again', 'repeat', 'nope', 'no', 'wrong', 'missed', 'forgot'],
  hard: ['hard', 'difficult', 'tough', 'brutal', 'rough', 'struggled'],
  good: ['good', 'okay', 'ok', 'fine', 'alright', 'yeah', 'correct', 'got it', 'sure'],
  easy: ['easy', 'simple', 'obvious', 'knew it', 'perfect', 'great'],
};

export function matchRating(transcript: string): RatingWord | null {
  const lower = transcript.toLowerCase().trim();
  for (const [rating, keywords] of Object.entries(RATING_KEYWORDS) as [RatingWord, string[]][]) {
    if (keywords.some((kw) => new RegExp(`\\b${kw}\\b`).test(lower))) return rating;
  }
  return null;
}

// ── TTS state (module-level — only one utterance plays at a time) ────────────

let _audio: HTMLAudioElement | null = null;
let _cancelled = false;
let _externalResolve: ((r: { cancelled: boolean }) => void) | null = null;

function _stopCurrent() {
  _cancelled = true;
  if (_audio) {
    try { _audio.pause(); } catch { /* ignore */ }
    _audio.src = '';
    _audio = null;
  }
  if (_externalResolve) {
    _externalResolve({ cancelled: true });
    _externalResolve = null;
  }
  // Also stop any browser fallback TTS
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speak text via Groq Orpheus TTS (Hannah voice).
 * Falls back to browser SpeechSynthesis if the API is unavailable.
 * Resolves with { cancelled: true } if interrupted, { cancelled: false } on natural end.
 */
export async function speak(text: string): Promise<{ cancelled: boolean }> {
  if (typeof window === 'undefined') return { cancelled: false };

  // Stop anything currently playing
  _stopCurrent();
  _cancelled = false;

  // ── Try Groq Orpheus first ──────────────────────────────────────────────────
  let res: Response | null = null;
  try {
    res = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Network error — fall through to browser TTS
  }

  if (_cancelled) return { cancelled: true };

  if (res?.ok) {
    try {
      const blob = await res.blob();
      if (_cancelled) return { cancelled: true };

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      _audio = audio;

      return new Promise<{ cancelled: boolean }>((resolve) => {
        _externalResolve = resolve;

        const cleanup = () => {
          URL.revokeObjectURL(url);
          if (_audio === audio) { _audio = null; }
          _externalResolve = null;
        };

        audio.onended = () => { cleanup(); resolve({ cancelled: false }); };
        audio.onerror = () => { cleanup(); resolve({ cancelled: false }); };
        audio.play().catch(() => { cleanup(); resolve({ cancelled: false }); });
      });
    } catch {
      // Blob/playback error — fall through to browser TTS
    }
  }

  if (_cancelled) return { cancelled: true };

  // ── Browser SpeechSynthesis fallback ─────────────────────────────────────
  if (!('speechSynthesis' in window)) return { cancelled: false };

  window.speechSynthesis.cancel();
  return new Promise<{ cancelled: boolean }>((resolve) => {
    _externalResolve = resolve;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.onend = () => { _externalResolve = null; resolve({ cancelled: false }); };
    utterance.onerror = (e) => { _externalResolve = null; resolve({ cancelled: e.error === 'interrupted' }); };
    window.speechSynthesis.speak(utterance);
  });
}

/** Cancel any ongoing TTS immediately. */
export function cancelSpeech(): void {
  _stopCurrent();
}
