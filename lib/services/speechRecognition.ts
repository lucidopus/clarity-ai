/**
 * Thin wrapper around the Web Speech API (SpeechRecognition).
 * All code runs only in browser — guard with typeof window checks.
 */

export type RatingWord = 'again' | 'hard' | 'good' | 'easy';

const RATING_KEYWORDS: Record<RatingWord, string[]> = {
  again: ['again', 'repeat'],
  hard: ['hard', 'difficult', 'tough'],
  good: ['good', 'okay', 'ok', 'fine'],
  easy: ['easy', 'simple', 'knew it'],
};

function matchRating(transcript: string): RatingWord | null {
  const lower = transcript.toLowerCase().trim();
  for (const [rating, keywords] of Object.entries(RATING_KEYWORDS) as [RatingWord, string[]][]) {
    if (keywords.some((kw) => new RegExp(`\\b${kw}\\b`).test(lower))) return rating;
  }
  return null;
}

/** Returns true if the browser supports speech recognition. */
export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

/** Returns true if the browser supports speech synthesis (TTS). */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface SpeechListenResult {
  rating: RatingWord;
}

/**
 * Listens for a single rating utterance and resolves with the matched rating,
 * or rejects on timeout / error / no match.
 */
export function listenForRating(timeoutMs = 6000): Promise<SpeechListenResult> {
  return new Promise((resolve, reject) => {
    if (!isSpeechRecognitionSupported()) {
      reject(new Error('SpeechRecognition not supported'));
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const recognition = new SR() as SpeechRecognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    let finished = false;
    const finish = (fn: () => void) => {
      if (!finished) {
        finished = true;
        try { recognition.stop(); } catch { /* ignore */ }
        fn();
      }
    };

    const timer = setTimeout(() => finish(reject.bind(null, new Error('Timeout'))), timeoutMs);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      clearTimeout(timer);
      for (let a = 0; a < event.results[0].length; a++) {
        const rating = matchRating(event.results[0][a].transcript);
        if (rating) {
          finish(() => resolve({ rating }));
          return;
        }
      }
      finish(reject.bind(null, new Error('No match')));
    };

    recognition.onerror = () => {
      clearTimeout(timer);
      finish(reject.bind(null, new Error('Recognition error')));
    };

    recognition.onnomatch = () => {
      clearTimeout(timer);
      finish(reject.bind(null, new Error('No match')));
    };

    recognition.start();
  });
}

/**
 * Speaks text using the browser's SpeechSynthesis API.
 * Resolves when speaking ends. Rejects on error.
 */
export function speak(
  text: string,
  options?: { rate?: number; pitch?: number; volume?: number }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error('SpeechSynthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      // 'interrupted' is expected when we cancel — treat as success
      if (e.error === 'interrupted') resolve();
      else reject(new Error(`TTS error: ${e.error}`));
    };

    window.speechSynthesis.speak(utterance);
  });
}

/** Cancel all pending and ongoing speech. */
export function cancelSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
