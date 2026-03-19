import type { ExtractorInput, ExtractedContent } from './types';

/**
 * Document extractor — PDF, PPTX, DOCX
 * Stub: will be implemented when document source type is added.
 */
export async function extractDocument(input: ExtractorInput): Promise<ExtractedContent> {
  void input;
  return {
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Document extraction is not yet implemented. Supported formats will include PDF, PPTX, and DOCX.',
      recoverable: false,
    },
  };
}
