import { fetchTranscript } from 'youtube-transcript-plus';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface TranscriptResult {
  text: string;
  videoId: string;
  segments: Array<{
    text: string;
    offset: number;
    duration: number;
  }>;
}

// Static proxy pool from Webshare free tier (10 datacenter proxies)
const STATIC_PROXY_POOL = [
  'http://qgapuysz:md6de0vje9ki@142.111.48.253:7030',
  'http://qgapuysz:md6de0vje9ki@31.59.20.176:6754',
  'http://qgapuysz:md6de0vje9ki@23.95.150.145:6114',
  'http://qgapuysz:md6de0vje9ki@198.23.239.134:6540',
  'http://qgapuysz:md6de0vje9ki@45.38.107.97:6014',
  'http://qgapuysz:md6de0vje9ki@107.172.163.27:6543',
  'http://qgapuysz:md6de0vje9ki@64.137.96.74:6641',
  'http://qgapuysz:md6de0vje9ki@216.10.27.159:6837',
  'http://qgapuysz:md6de0vje9ki@142.111.67.146:5611',
  'http://qgapuysz:md6de0vje9ki@142.147.128.93:6593',
];

// Track which proxies have been tried for current request
let currentProxyIndex = 0;

function getNextProxy(): string {
  const proxy = STATIC_PROXY_POOL[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % STATIC_PROXY_POOL.length;
  return proxy;
}

/**
 * Creates custom fetch functions with Webshare static proxy support.
 */
const createCustomFetch = (userAgent: string, lang: string, proxyAgent?: any, proxyUrl?: string) => {
  return async ({ url, method = 'GET', body, headers: customHeaders }: {
    url: string;
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    lang?: string;
    userAgent?: string;
  }) => {
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

    const logPrefix = proxyAgent ? '🌐 [PROXY FETCH]' : '📡 [DIRECT FETCH]';
    console.log(`${logPrefix} ${method} ${url.substring(0, 80)}...`);

    if (proxyAgent && proxyUrl) {
      console.log(`🌐 [PROXY] Routing through: ${proxyUrl.replace(/:[^:]+@/, ':***@')}`);
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        // @ts-ignore
        agent: proxyAgent,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error: any) {
      if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED') {
        throw new Error(`Proxy connection failed: ${error.message}`);
      }
      if (error.cause?.code === 'ETIMEDOUT' || error.code === 'ETIMEDOUT') {
        throw new Error(`Request timeout: ${error.message}`);
      }
      throw new Error(`Request failed: ${error.message}`);
    }
  };
};

export async function getYouTubeTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  console.log('📜 [TRANSCRIPT] Starting transcript extraction...');
  console.log(`📜 [TRANSCRIPT] URL: ${youtubeUrl}`);

  const videoId = extractVideoId(youtubeUrl);
  console.log(`📜 [TRANSCRIPT] Video ID extracted: ${videoId}`);

  const proxyEnabled = process.env.WEBSHARE_PROXY_ENABLED === 'true';

  if (proxyEnabled) {
    console.log('🌐 [PROXY] ✅ PROXY ENABLED - Using static datacenter proxy pool (10 proxies)');
  } else {
    console.log('📡 [DIRECT] ❌ PROXY DISABLED - Using direct connection');
  }

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const lang = 'en';

  // Try with each proxy in the pool until one works
  const maxProxiesToTry = proxyEnabled ? STATIC_PROXY_POOL.length : 1;

  for (let proxyAttempt = 0; proxyAttempt < maxProxiesToTry; proxyAttempt++) {
    const currentProxyUrl = proxyEnabled ? getNextProxy() : null;
    const proxyAgent = currentProxyUrl ? new (HttpsProxyAgent as any)(currentProxyUrl) : null;

    if (proxyEnabled && currentProxyUrl) {
      console.log(`🌐 [PROXY] Trying proxy ${proxyAttempt + 1}/${maxProxiesToTry}: ${currentProxyUrl.replace(/:[^:]+@/, ':***@')}`);
    }

    const customFetch = createCustomFetch(userAgent, lang, proxyAgent, currentProxyUrl);

    // Retry each proxy 2 times before moving to next proxy
    const retriesPerProxy = 2;

    for (let attempt = 0; attempt < retriesPerProxy; attempt++) {
      try {
        const connectionType = proxyAgent ? `🌐 proxy ${proxyAttempt + 1}` : '📡 direct';
        console.log(`📜 [TRANSCRIPT] Attempt ${attempt + 1}/${retriesPerProxy} via ${connectionType}...`);

        const transcriptSegments = await fetchTranscript(youtubeUrl, {
          lang,
          userAgent,
          videoFetch: customFetch,
          playerFetch: customFetch,
          transcriptFetch: customFetch,
        });

        console.log(`✅ [TRANSCRIPT] Successfully extracted ${transcriptSegments.length} segments via ${connectionType}`);

        const text = transcriptSegments.map((item) => item.text).join(' ');
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
        console.error(`❌ [TRANSCRIPT] Attempt ${attempt + 1}/${retriesPerProxy} failed:`, error);

        const errorMessage = error instanceof Error ? error.message : String(error);

        // If it's "No transcripts available" error, this proxy is blocked - try next proxy
        if (errorMessage.includes('No transcripts are available')) {
          console.warn(`⚠️ [PROXY] This proxy appears to be blocked by YouTube, trying next proxy...`);
          break; // Break retry loop, try next proxy
        }

        // For other errors, retry with same proxy
        if (attempt < retriesPerProxy - 1) {
          console.log(`⏳ [TRANSCRIPT] Retrying with same proxy in 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  // All proxies exhausted
  throw new Error('Failed to extract transcript: All proxies exhausted or no transcripts available');
}

export function extractVideoId(url: string): string {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  if (!match) throw new Error('Invalid YouTube URL');
  return match[1];
}

export function isValidYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(url);
}
