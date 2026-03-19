import type { ExtractorInput, ExtractedContent } from './types';

/**
 * Audio extractor — Groq Whisper transcription + browser recording
 * Stub: will be implemented when audio source type is added.
 */
export async function extractAudio(input: ExtractorInput): Promise<ExtractedContent> {
  void input;
  return {
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Audio extraction is not yet implemented. Will support MP3, WAV, WebM, M4A, FLAC, and OGG via Groq Whisper.',
      recoverable: false,
    },
  };
}
