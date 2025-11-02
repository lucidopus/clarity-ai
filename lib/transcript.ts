import { fetchTranscript } from 'youtube-transcript-plus';

export interface TranscriptResult {
  text: string;
  videoId: string;
  segments: Array<{
    text: string;
    offset: number;
    duration: number;
  }>;
}

export async function getYouTubeTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  console.log('📜 [TRANSCRIPT] Starting transcript extraction...');
  console.log(`📜 [TRANSCRIPT] URL: ${youtubeUrl}`);

  try {
    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl);
    console.log(`📜 [TRANSCRIPT] Video ID extracted: ${videoId}`);

    // Fetch transcript using youtube-transcript-plus
    console.log('📜 [TRANSCRIPT] Fetching transcript from YouTube...');
    const transcriptSegments = await fetchTranscript(youtubeUrl, {
      lang: 'en',
      //@ts-ignore
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    });
    console.log(`📜 [TRANSCRIPT] Received ${transcriptSegments.length} transcript segments`);

    // Combine into continuous text
    const text = transcriptSegments.map((item) => item.text).join(' ');
    console.log(`📜 [TRANSCRIPT] Combined text length: ${text.length} characters`);

    console.log('✅ [TRANSCRIPT] Transcript extraction completed successfully');
    return {
      text,
      videoId,
      segments: transcriptSegments.map((segment) => ({
        text: segment.text,
        offset: segment.offset,
        duration: segment.duration,
      })),
    };
  } catch (error) {
    console.error('❌ [TRANSCRIPT] Extraction failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [TRANSCRIPT] Error details: ${errorMessage}`);
    throw new Error(`Failed to extract transcript: ${errorMessage}`);
  }
}

export function extractVideoId(url: string): string {
  // Extract from: https://youtu.be/ABC123 or https://youtube.com/watch?v=ABC123
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  if (!match) throw new Error('Invalid YouTube URL');
  return match[1];
}

export function isValidYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(url);
}
