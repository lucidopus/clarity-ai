import crypto from 'crypto';
import type { ExtractorInput, ExtractedContent } from './types';

/**
 * Live lecture extractor — handles pre-assembled transcript text from LiveSession.
 * The transcript has already been accumulated via real-time sync, so this extractor
 * simply passes it through with appropriate metadata.
 */
export async function extractLiveLecture(input: ExtractorInput): Promise<ExtractedContent> {
  const { rawText, title } = input;

  if (!rawText || rawText.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'EMPTY_CONTENT',
        message: 'Live lecture transcript is empty.',
        recoverable: false,
      },
    };
  }

  const text = rawText.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    success: true,
    text,
    title: title || 'Live Lecture',
    metadata: {
      sourceType: 'live_lecture',
      sourceId: crypto.randomUUID(),
      wordCount,
      language: 'en',
    },
  };
}
