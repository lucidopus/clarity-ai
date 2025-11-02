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

// Custom fetch function to mimic browser behavior and bypass IP blocking
const createCustomFetch = (userAgent: string, lang: string) => {
  return async ({ url, method = 'GET', body, headers: customHeaders }: {
    url: string;
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    lang?: string;
    userAgent?: string;
  }) => {
    // Enhanced headers to better mimic a real browser
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept-Language': `${lang},en-US;q=0.9,en;q=0.8`,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      ...customHeaders,
    };

    console.log(`📡 [CUSTOM FETCH] ${method} request to: ${url.substring(0, 100)}...`);

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      console.error(`❌ [CUSTOM FETCH] HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  };
};

export async function getYouTubeTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  console.log('📜 [TRANSCRIPT] Starting transcript extraction...');
  console.log(`📜 [TRANSCRIPT] URL: ${youtubeUrl}`);

  try {
    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl);
    console.log(`📜 [TRANSCRIPT] Video ID extracted: ${videoId}`);

    // Use a modern Chrome user agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    const lang = 'en';

    // Create custom fetch functions
    const customFetch = createCustomFetch(userAgent, lang);

    // Fetch transcript using youtube-transcript-plus with custom fetch functions
    console.log('📜 [TRANSCRIPT] Fetching transcript from YouTube with custom fetch...');
    const transcriptSegments = await fetchTranscript(youtubeUrl, {
      lang,
      userAgent,
      // Inject custom fetch functions for all three request types
      videoFetch: customFetch,
      playerFetch: customFetch,
      transcriptFetch: customFetch,
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
    console.error(`❌ [TRANSCRIPT] This may be due to YouTube blocking cloud provider IPs. Consider using a proxy service if the issue persists.`);
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
