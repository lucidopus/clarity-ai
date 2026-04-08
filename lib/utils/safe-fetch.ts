/**
 * SSRF-safe fetch wrapper.
 * Only allows fetching from the configured Supabase Storage origin.
 * Enforces size limits and timeouts on all requests.
 */

export async function safeFetch(
  url: string,
  opts?: { maxBytes?: number; timeoutMs?: number }
): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }

  const parsedUrl = new URL(url);
  const allowedOrigin = new URL(supabaseUrl).origin;

  if (parsedUrl.origin !== allowedOrigin) {
    throw new Error(`URL origin not allowed: ${parsedUrl.origin}`);
  }

  // Block private/internal IPs
  const hostname = parsedUrl.hostname;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error('Requests to internal/private IPs are not allowed');
  }

  const timeoutMs = opts?.timeoutMs ?? 30000;
  const maxBytes = opts?.maxBytes ?? 50 * 1024 * 1024; // 50 MB default

  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  if (contentLength > maxBytes) {
    throw new Error(`Response too large: ${contentLength} bytes exceeds ${maxBytes} byte limit`);
  }

  return response;
}
