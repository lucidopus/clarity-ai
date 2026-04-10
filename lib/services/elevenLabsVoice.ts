/**
 * Voice service for voice flashcard review.
 * TTS: browser SpeechSynthesis (free, no API).
 * STT: getUserMedia + MediaRecorder + VAD → /api/voice/stt (Groq Whisper).
 */

export type RatingWord = 'again' | 'hard' | 'good' | 'easy';

const RATING_KEYWORDS: Record<RatingWord, string[]> = {
  again: ['again', 'repeat'],
  hard: ['hard', 'difficult', 'tough'],
  good: ['good', 'okay', 'ok', 'fine'],
  easy: ['easy', 'simple'],
};

function matchRating(transcript: string): RatingWord | null {
  const lower = transcript.toLowerCase().trim();
  for (const [rating, keywords] of Object.entries(RATING_KEYWORDS) as [RatingWord, string[]][]) {
    if (keywords.some((kw) => new RegExp(`\\b${kw}\\b`).test(lower))) return rating;
  }
  return null;
}

// ── TTS (browser SpeechSynthesis) ───────────────────────────────────────────

/** Speak text using the browser's built-in SpeechSynthesis. Resolves when done. */
export async function speak(text: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve(); // always advance
    window.speechSynthesis.speak(utterance);
  });
}

/** Cancel any ongoing TTS. */
export function cancelSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// ── STT (VAD + MediaRecorder + ElevenLabs Scribe) ───────────────────────────

// RMS amplitude thresholds (analyser returns 0-255 byte frequency data)
const SPEECH_THRESHOLD = 15;       // above = speech, below = silence
const SILENCE_DURATION_MS = 800;   // sustained silence after speech triggers send
const MIN_SPEECH_DURATION_MS = 250; // ignore very short noise bursts

export interface VoiceListenerCallbacks {
  onRating: (rating: RatingWord) => void;
  onPermissionDenied: () => void;
  onListening: (active: boolean) => void;
}

/**
 * Starts a hands-free voice rating listener:
 *  1. getUserMedia to open the mic (triggers macOS yellow dot + permission dialog)
 *  2. AudioContext AnalyserNode for VAD (voice activity detection)
 *  3. MediaRecorder captures audio; when VAD detects speech end, blob is sent to
 *     /api/voice/stt (ElevenLabs Scribe) and transcript is matched for keywords
 *
 * Returns a cleanup/stop function.
 */
export function startVoiceRatingListener({
  onRating,
  onPermissionDenied,
  onListening,
}: VoiceListenerCallbacks): () => void {
  let stopped = false;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let audioCtx: AudioContext | null = null;
  let vadInterval: ReturnType<typeof setInterval> | null = null;
  let chunks: BlobPart[] = [];

  // VAD state
  let isSpeaking = false;
  let speechStartTime = 0;
  let silenceStart = 0;

  const stopAll = () => {
    stopped = true;
    if (vadInterval) { clearInterval(vadInterval); vadInterval = null; }
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { /* ignore */ }
    }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    onListening(false);
  };

  const sendChunk = async (blob: Blob) => {
    if (stopped || blob.size < 1000) return; // skip tiny blobs
    try {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      const res = await fetch('/api/voice/stt', { method: 'POST', body: form });
      if (!res.ok || stopped) return;
      const { text } = await res.json() as { text?: string };
      const rating = matchRating(text ?? '');
      if (rating && !stopped) onRating(rating);
    } catch {
      // Network error — keep listening
    }
  };

  const startRecorder = () => {
    if (stopped || !stream) return;
    chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        if (stopped) return;
        const blob = new Blob(chunks, { type: recorder?.mimeType ?? 'audio/webm' });
        chunks = [];
        sendChunk(blob);
      };
      recorder.start();
    } catch {
      // MediaRecorder not available — ignore
    }
  };

  const stopRecorderAndSend = () => {
    if (!recorder || recorder.state === 'inactive') return;
    try { recorder.stop(); } catch { /* ignore */ }
  };

  // Open mic
  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then((s) => {
      if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s;
      onListening(true);

      // Set up VAD via Web Audio
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(s);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      startRecorder();

      // VAD poll every 50ms
      vadInterval = setInterval(() => {
        if (stopped) return;
        analyser.getByteFrequencyData(freqData);
        const rms = freqData.reduce((s, v) => s + v, 0) / freqData.length;
        const now = Date.now();

        if (rms > SPEECH_THRESHOLD) {
          if (!isSpeaking) { isSpeaking = true; speechStartTime = now; }
          silenceStart = 0;
        } else {
          if (isSpeaking) {
            if (silenceStart === 0) silenceStart = now;
            if (now - silenceStart >= SILENCE_DURATION_MS) {
              // Speech ended — send if utterance was long enough
              const speechDuration = silenceStart - speechStartTime;
              isSpeaking = false;
              silenceStart = 0;
              speechStartTime = 0;
              if (speechDuration >= MIN_SPEECH_DURATION_MS) {
                stopRecorderAndSend();
                startRecorder(); // Fresh recorder for next utterance
              }
            }
          }
        }
      }, 50);
    })
    .catch(() => {
      if (!stopped) onPermissionDenied();
    });

  return stopAll;
}
