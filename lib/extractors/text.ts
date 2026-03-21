import crypto from 'crypto';
import type { ExtractorInput, ExtractedContent } from './types';

/**
 * Text extractor — handles plain text input (lecture notes, study notes, etc.)
 * No extraction step needed — the text IS the content.
 */
export async function extractText(input: ExtractorInput): Promise<ExtractedContent> {
  const { rawText, title } = input;

  if (!rawText || rawText.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'EMPTY_CONTENT',
        message: 'No text provided.',
        recoverable: false,
      },
    };
  }

  const text = rawText.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const autoTitle = title?.trim() || 'Text Notes';

  return {
    success: true,
    text,
    title: autoTitle,
    metadata: {
      sourceType: 'text',
      sourceId: crypto.randomUUID(),
      wordCount,
      language: 'en',
    },
    // No segments for plain text
  };
}
