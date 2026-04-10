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

/**
 * Starts a looping speech recognition session that keeps listening until a
 * rating keyword is matched or the returned stop function is called.
 *
 * Uses continuous=false + manual restart per utterance — more reliable than
 * continuous=true because each attempt gets a fresh SpeechRecognition instance
 * (restarting a stopped instance is buggy across browsers).
 *
 * Returns a cleanup/stop function.
 */
export function startContinuousRatingListener(
  onRating: (rating: RatingWord) => void,
  onPermissionDenied?: () => void
): () => void {
  if (!isSpeechRecognitionSupported()) return () => {};

  let stopped = false;
  let active: SpeechRecognition | null = null;

  const startSession = () => {
    if (stopped) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const recognition = new SR() as SpeechRecognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;
    active = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let a = 0; a < event.results[0].length; a++) {
        const rating = matchRating(event.results[0][a].transcript);
        if (rating) {
          stopped = true;
          active = null;
          onRating(rating);
          return;
        }
      }
      // No keyword matched — onend will restart for next utterance
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (stopped) return;
      active = null;
      if (event.error === 'aborted') {
        stopped = true;
        return;
      }
      if (event.error === 'not-allowed') {
        stopped = true;
        onPermissionDenied?.();
        return;
      }
      setTimeout(startSession, 300);
    };

    recognition.onend = () => {
      if (stopped) return;
      active = null;
      startSession(); // Restart with a fresh instance immediately
    };

    try {
      recognition.start();
    } catch {
      active = null;
      setTimeout(startSession, 300);
    }
  };

  startSession();

  return () => {
    stopped = true;
    if (active) {
      active.onend = null;
      active.onerror = null;
      try { active.stop(); } catch { /* ignore */ }
      active = null;
    }
  };
}
