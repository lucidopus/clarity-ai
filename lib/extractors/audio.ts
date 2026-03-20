import crypto from 'crypto';
import Groq from 'groq-sdk';
import type { ExtractorInput, ExtractedContent, ExtractedSegment } from './types';

/**
 * Audio extractor — Transcribes audio files via Groq Whisper.
 * Supports MP3, WAV, M4A, FLAC, OGG, WebM.
 *
 * Expects `fileUrl` (Supabase public URL) in the input.
 * Downloads the file, sends to Groq Whisper, returns timestamped transcript.
 */
export async function extractAudio(input: ExtractorInput): Promise<ExtractedContent> {
  const { fileUrl, fileName, mimeType } = input;

  if (!fileUrl) {
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: 'No file URL provided for audio extraction.',
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
          message: `Failed to download audio file: HTTP ${response.status}`,
          recoverable: true,
        },
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File-like object for the Groq API
    const ext = fileName?.split('.').pop() || 'mp3';
    const file = new File([buffer], fileName || `audio.${ext}`, {
      type: mimeType || 'audio/mpeg',
    });

    // Transcribe using Groq Whisper with verbose JSON for timestamps
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const transcriptText = transcription.text?.trim();
    if (!transcriptText) {
      return {
        success: false,
        error: {
          code: 'EMPTY_CONTENT',
          message: 'No speech could be detected in the audio file.',
          recoverable: false,
        },
      };
    }

    // Build segments from Whisper timestamps
    const segments: ExtractedSegment[] = [];
    const rawSegments = (transcription as unknown as { segments?: Array<{ text: string; start: number; end: number }> }).segments;

    if (rawSegments && Array.isArray(rawSegments)) {
      for (const seg of rawSegments) {
        if (seg.text?.trim()) {
          segments.push({
            text: seg.text.trim(),
            startTime: Math.round(seg.start),
            endTime: Math.round(seg.end),
          });
        }
      }
    }

    const wordCount = transcriptText.split(/\s+/).filter(Boolean).length;
    const duration = rawSegments?.length
      ? Math.round(rawSegments[rawSegments.length - 1].end)
      : undefined;

    // Derive title from fileName
    const title = fileName
      ? fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      : 'Audio Recording';

    return {
      success: true,
      text: transcriptText,
      title,
      metadata: {
        sourceType: 'audio',
        sourceId: crypto.randomUUID(),
        duration,
        language: (transcription as unknown as { language?: string }).language || 'en',
        fileSize: buffer.length,
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
        message: err instanceof Error ? err.message : 'Audio transcription failed',
        recoverable: false,
      },
    };
  }
}
