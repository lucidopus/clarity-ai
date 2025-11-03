import { NextRequest, NextResponse } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';

export async function GET(req: NextRequest) {
  try {
    // Check if proxy is configured
    const proxyEnabled = process.env.WEBSHARE_PROXY_ENABLED === 'true';
    const proxyUrl = process.env.WEBSHARE_PROXY_URL;

    if (!proxyEnabled || !proxyUrl) {
      return NextResponse.json({
        success: false,
        message: 'Proxy not configured',
        config: {
          enabled: proxyEnabled,
          hasUrl: !!proxyUrl,
        },
      }, { status: 400 });
    }

    // Test proxy connection
    console.log('🧪 [TEST] Testing Webshare proxy connection...');
    const proxyAgent = new (HttpsProxyAgent as any)(proxyUrl);

    // Test 1: Check external IP
    const ipResponse = await fetch('https://api.ipify.org?format=json', {
      // @ts-ignore
      agent: proxyAgent,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!ipResponse.ok) {
      throw new Error(`Proxy connection failed: ${ipResponse.status}`);
    }

    const ipData = await ipResponse.json();
    console.log(`✅ [TEST] Proxy working! External IP: ${ipData.ip}`);

    // Test 2: Try fetching a YouTube page (simulate transcript fetch)
    const youtubeTestUrl = 'https://www.youtube.com/watch?v=S9aWBbVypeU';
    const youtubeResponse = await fetch(youtubeTestUrl, {
      // @ts-ignore
      agent: proxyAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    const youtubeAccessible = youtubeResponse.ok;
    console.log(`✅ [TEST] YouTube accessible: ${youtubeAccessible}`);

    return NextResponse.json({
      success: true,
      message: 'Proxy validation successful',
      proxy: {
        enabled: true,
        externalIp: ipData.ip,
        youtubeAccessible,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ [TEST] Proxy validation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      success: false,
      message: 'Proxy validation failed',
      error: errorMessage,
    }, { status: 500 });
  }
}