import type { ExtractorInput, ExtractedContent } from './types';

/**
 * Media extractor — Gemini Vision for images of notes/whiteboards
 * Stub: will be implemented when media source type is added.
 */
export async function extractMedia(input: ExtractorInput): Promise<ExtractedContent> {
  void input;
  return {
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Media extraction is not yet implemented. Will support JPG, PNG, HEIC, and WebP via Gemini Vision.',
      recoverable: false,
    },
  };
}
