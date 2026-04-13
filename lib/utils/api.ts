import { NextResponse } from 'next/server';

const DEFAULT_MAX_BYTES = 1_000_000; // 1 MB

/**
 * Parse JSON body from a request with size validation.
 * Returns the parsed body or a NextResponse error (413 Payload Too Large).
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BYTES
): Promise<T | NextResponse> {
  // Check Content-Length header first (fast rejection)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return NextResponse.json(
      { error: `Payload too large. Maximum size is ${Math.round(maxBytes / 1024)}KB.` },
      { status: 413 }
    );
  }

  // Read body as text with size check (handles chunked encoding where Content-Length is absent)
  const text = await request.text();
  if (text.length > maxBytes) {
    return NextResponse.json(
      { error: `Payload too large. Maximum size is ${Math.round(maxBytes / 1024)}KB.` },
      { status: 413 }
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}

/** Type guard to check if parseJsonBody returned an error response. */
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
