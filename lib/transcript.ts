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
 * Enhanced with comprehensive error logging for debugging.
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

    // Determine which YouTube API this is calling
    let fetchType = 'UNKNOWN';
    if (url.includes('youtube.com/watch')) {
      fetchType = 'VIDEO_PAGE';
    } else if (url.includes('youtubei/v1/player')) {
      fetchType = 'PLAYER_API';
    } else if (url.includes('timedtext') || url.includes('caption')) {
      fetchType = 'TRANSCRIPT_DATA';
    }

    const logPrefix = proxyAgent ? '🌐 [PROXY FETCH]' : '📡 [DIRECT FETCH]';
    console.log(`${logPrefix} [${fetchType}] ${method} ${url.substring(0, 100)}...`);

    if (proxyAgent && proxyUrl) {
      const maskedUrl = proxyUrl.replace(/:[^:]+@/, ':***@');
      console.log(`🌐 [PROXY] [${fetchType}] Routing through: ${maskedUrl}`);
    }

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        // @ts-ignore
        agent: proxyAgent,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [FETCH] [${fetchType}] Response: ${response.status} ${response.statusText} (${duration}ms)`);

      if (!response.ok) {
        console.error(`❌ [FETCH] [${fetchType}] HTTP ${response.status}: ${response.statusText}`);
        console.error(`❌ [FETCH] [${fetchType}] URL: ${url.substring(0, 100)}`);

        // Log response body for debugging (first 500 chars)
        try {
          const text = await response.text();
          console.error(`❌ [FETCH] [${fetchType}] Response body (first 500 chars): ${text.substring(0, 500)}`);
        } catch (e) {
          console.error(`❌ [FETCH] [${fetchType}] Could not read response body`);
        }

        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [FETCH] [${fetchType}] Error after ${duration}ms:`, error);

      // Detailed error categorization
      if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED') {
        console.error(`❌ [PROXY ERROR] Connection refused - proxy server not reachable`);
        console.error(`❌ [PROXY ERROR] Proxy URL: ${proxyUrl?.replace(/:[^:]+@/, ':***@')}`);
        throw new Error(`Proxy connection failed (ECONNREFUSED): ${error.message}`);
      }

      if (error.cause?.code === 'ETIMEDOUT' || error.code === 'ETIMEDOUT') {
        console.error(`❌ [TIMEOUT ERROR] Request timed out after ${duration}ms`);
        console.error(`❌ [TIMEOUT ERROR] ${proxyAgent ? 'Proxy may be slow or unresponsive' : 'Direct connection timeout'}`);
        throw new Error(`Request timeout (${duration}ms): ${error.message}`);
      }

      if (error.cause?.code === 'ENOTFOUND' || error.code === 'ENOTFOUND') {
        console.error(`❌ [DNS ERROR] Hostname not found - DNS resolution failed`);
        throw new Error(`DNS error (ENOTFOUND): ${error.message}`);
      }

      if (error.cause?.code === 'ECONNRESET' || error.code === 'ECONNRESET') {
        console.error(`❌ [CONNECTION ERROR] Connection reset by peer`);
        console.error(`❌ [CONNECTION ERROR] ${proxyAgent ? 'Proxy may have closed connection' : 'Server closed connection'}`);
        throw new Error(`Connection reset: ${error.message}`);
      }

      // Log full error details
      console.error(`❌ [FETCH] [${fetchType}] Error name: ${error.name}`);
      console.error(`❌ [FETCH] [${fetchType}] Error code: ${error.code || 'N/A'}`);
      console.error(`❌ [FETCH] [${fetchType}] Error cause:`, error.cause || 'N/A');

      throw new Error(`Request failed [${fetchType}]: ${error.message}`);
    }
  };
};

export async function getYouTubeTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📜 [TRANSCRIPT] Starting transcript extraction...');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📺 URL: ${youtubeUrl}`);

  const videoId = extractVideoId(youtubeUrl);
  console.log(`🎬 Video ID: ${videoId}`);

  const proxyEnabled = process.env.WEBSHARE_PROXY_ENABLED === 'true';
  console.log(`🌐 Proxy enabled: ${proxyEnabled ? 'YES' : 'NO'}`);

  if (proxyEnabled) {
    console.log(`🔢 Proxy pool size: ${STATIC_PROXY_POOL.length} datacenter proxies`);
    console.log(`🔄 Strategy: Round-robin rotation with 2 retries per proxy`);
    console.log(`📊 Max attempts: ${STATIC_PROXY_POOL.length * 2} total`);
    console.log('');
    console.log('⚠️  Note: Using datacenter proxies (free tier)');
    console.log('⚠️  YouTube may block some/all datacenter IPs');
    console.log('⚠️  Consider residential proxies if extraction fails');
  } else {
    console.log('');
    console.log('⚠️  Direct connection (no proxy)');
    console.log('⚠️  May fail in cloud environments (Vercel, AWS, etc.)');
    console.log('⚠️  YouTube blocks most cloud provider IPs');
  }
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const lang = 'en';

  // Try with each proxy in the pool until one works
  const maxProxiesToTry = proxyEnabled ? STATIC_PROXY_POOL.length : 1;
  const retriesPerProxy = 2; // Retry each proxy 2 times before moving to next

  for (let proxyAttempt = 0; proxyAttempt < maxProxiesToTry; proxyAttempt++) {
    const currentProxyUrl = proxyEnabled ? getNextProxy() : null;
    const proxyAgent = currentProxyUrl ? new (HttpsProxyAgent as any)(currentProxyUrl) : null;

    if (proxyEnabled && currentProxyUrl) {
      console.log(`🌐 [PROXY] Trying proxy ${proxyAttempt + 1}/${maxProxiesToTry}: ${currentProxyUrl.replace(/:[^:]+@/, ':***@')}`);
    }

    const customFetch = createCustomFetch(userAgent, lang, proxyAgent, currentProxyUrl || undefined);

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

        // Log detailed error information
        console.error(`❌ [TRANSCRIPT] Error message: ${errorMessage}`);
        console.error(`❌ [TRANSCRIPT] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);

        // If it's "No transcripts available" error, this proxy is blocked - try next proxy
        if (errorMessage.includes('No transcripts are available')) {
          console.warn(`⚠️ [PROXY BLOCKED] YouTube returned "No transcripts available" for this proxy`);
          console.warn(`⚠️ [PROXY BLOCKED] This usually means YouTube is blocking the proxy's IP address`);
          console.warn(`⚠️ [PROXY BLOCKED] Trying next proxy in pool...`);
          break; // Break retry loop, try next proxy
        }

        // Check if it's a proxy connection issue
        if (errorMessage.includes('Proxy connection failed') || errorMessage.includes('ECONNREFUSED')) {
          console.error(`❌ [PROXY CONNECTION] Cannot connect to proxy server`);
          console.error(`❌ [PROXY CONNECTION] Proxy may be offline or credentials invalid`);
          console.error(`❌ [PROXY CONNECTION] Trying next proxy...`);
          break; // Try next proxy
        }

        // For other errors, retry with same proxy
        if (attempt < retriesPerProxy - 1) {
          console.log(`⏳ [TRANSCRIPT] Retrying with same proxy in 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  // All proxies exhausted - provide diagnostic summary
  console.error('');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('❌ [DIAGNOSTIC SUMMARY] Transcript Extraction Failed');
  console.error('═══════════════════════════════════════════════════════════');
  console.error(`📺 Video ID: ${videoId}`);
  console.error(`🔗 URL: ${youtubeUrl}`);
  console.error(`🌐 Proxy enabled: ${proxyEnabled ? 'YES' : 'NO'}`);
  if (proxyEnabled) {
    console.error(`🔢 Proxies tried: ${maxProxiesToTry} (${retriesPerProxy} retries each)`);
    console.error(`📊 Total attempts: ${maxProxiesToTry * retriesPerProxy}`);
  }
  console.error('');
  console.error('🔍 Possible causes:');
  console.error('  1. All proxies are blocked by YouTube (datacenter IPs detected)');
  console.error('  2. Video genuinely has no transcripts/captions available');
  console.error('  3. Proxy credentials are invalid or proxies are offline');
  console.error('  4. YouTube changed their API/blocking mechanisms');
  console.error('');
  console.error('💡 Recommended actions:');
  console.error('  1. Verify video has captions: Open in YouTube and check CC button');
  console.error('  2. Test without proxy: Set WEBSHARE_PROXY_ENABLED=false');
  console.error('  3. Upgrade to residential proxies: Datacenter IPs are often blocked');
  console.error('  4. Check Webshare dashboard for proxy health status');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('');

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
