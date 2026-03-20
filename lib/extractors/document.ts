import crypto from 'crypto';
import type { ExtractorInput, ExtractedContent, ExtractedSegment } from './types';

/**
 * Document extractor — PDF, PPTX
 * Extracts text page-by-page (or slide-by-slide) and formats as:
 *   Page 1: <content>\nPage 2: <content>\n...
 *
 * Expects `fileUrl` (Supabase public URL) in the input.
 * Downloads the file, then parses based on mimeType.
 */
export async function extractDocument(input: ExtractorInput): Promise<ExtractedContent> {
  const { fileUrl, fileName, mimeType } = input;

  if (!fileUrl) {
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: 'No file URL provided for document extraction.',
        recoverable: false,
      },
    };
  }

  try {
    // Download file from Supabase
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: `Failed to download file: HTTP ${response.status}`,
          recoverable: true,
        },
      };
    }

    const arrayBuffer = await response.arrayBuffer();

    let pages: { text: string; num: number }[];

    if (mimeType === 'application/pdf') {
      pages = await extractPdfPages(arrayBuffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      pages = await extractPptxSlides(arrayBuffer);
    } else {
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: `Unsupported document format: ${mimeType}`,
          recoverable: false,
        },
      };
    }

    // Filter out empty pages
    const nonEmptyPages = pages.filter((p) => p.text.trim().length > 0);

    if (nonEmptyPages.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_CONTENT',
          message: 'No text content could be extracted from the document. It may be scanned/image-based.',
          recoverable: false,
        },
      };
    }

    // Build page-structured text: "Page 1: <content>\nPage 2: <content>..."
    const structuredText = nonEmptyPages
      .map((p) => `Page ${p.num}: ${p.text.trim()}`)
      .join('\n');

    // Build segments (one per page)
    const segments: ExtractedSegment[] = nonEmptyPages.map((p) => ({
      text: p.text.trim(),
      page: p.num,
    }));

    const fullText = nonEmptyPages.map((p) => p.text.trim()).join(' ');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    // Derive title from fileName
    const title = fileName
      ? fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      : 'Uploaded Document';

    return {
      success: true,
      text: structuredText,
      title,
      metadata: {
        sourceType: 'document',
        sourceId: crypto.randomUUID(),
        pageCount: pages.length,
        language: 'en',
        fileSize: arrayBuffer.byteLength,
        fileName,
        mimeType,
        wordCount,
      },
      segments,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: err instanceof Error ? err.message : 'Unknown extraction error',
        recoverable: false,
      },
    };
  }
}

// ─── PDF Extraction (page-by-page) ──────────────────────────────────────────

async function extractPdfPages(arrayBuffer: ArrayBuffer): Promise<{ text: string; num: number }[]> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
  const { text } = await extractText(pdf, { mergePages: false });

  // text is string[] — one entry per page
  return text.map((pageText, i) => ({ text: pageText, num: i + 1 }));
}

// ─── PPTX Extraction (slide-by-slide) ───────────────────────────────────────

async function extractPptxSlides(arrayBuffer: ArrayBuffer): Promise<{ text: string; num: number }[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);

  // PPTX slides are at ppt/slides/slide1.xml, slide2.xml, etc.
  const slideFiles: { num: number; path: string }[] = [];

  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (match) {
      slideFiles.push({ num: parseInt(match[1], 10), path: relativePath });
    }
  });

  // Sort by slide number
  slideFiles.sort((a, b) => a.num - b.num);

  const slides: { text: string; num: number }[] = [];

  for (const slide of slideFiles) {
    const xml = await zip.file(slide.path)?.async('string');
    if (!xml) {
      slides.push({ text: '', num: slide.num });
      continue;
    }
    // Extract all text content from <a:t> tags
    const texts: string[] = [];
    const tagRegex = /<a:t>([\s\S]*?)<\/a:t>/g;
    let match;
    while ((match = tagRegex.exec(xml)) !== null) {
      const decoded = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      texts.push(decoded);
    }
    slides.push({ text: texts.join(' '), num: slide.num });
  }

  return slides;
}
