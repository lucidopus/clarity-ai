/**
 * User-Friendly Error Sanitizer
 *
 * Centralized utility for converting any error (API response, JS Error, unknown value)
 * into a safe, user-friendly message that never leaks technical details (stack traces,
 * DB errors, raw SDK errors, HTTP status noise, etc.).
 *
 * Usage:
 *   setError(getUserFriendlyMessage(err));
 *   setError(getUserFriendlyMessage(err, 'Unable to load your videos.'));
 *
 *   const friendly = await extractApiErrorMessage(response);
 */
import { ApiError } from '@/lib/errors/ApiError';
import { ERROR_MESSAGES, getErrorConfig } from '@/lib/errorMessages';

const DEFAULT_FALLBACK =
  'Something went wrong. Please try again in a moment.';

const NETWORK_HINTS = [
  'failed to fetch',
  'networkerror',
  'load failed',
  'network request failed',
  'err_network',
  'err_internet_disconnected',
];

/**
 * A shape we recognize as "already a user-friendly message" produced by our own API layer.
 * These shapes carry either an `errorType` discriminator we can look up, or a controlled
 * `message` that has been vetted (e.g. "Invalid username or password").
 */
export interface ApiErrorResponseShape {
  errorType?: string;
  message?: string;
  error?: string;
}

/**
 * Regex patterns that reliably indicate a technical/developer-only message.
 */
const TECHNICAL_PATTERNS: RegExp[] = [
  /\[object\s+\w+\]/i,          // "[object Object]" leak
  /\b0x[0-9a-f]{4,}\b/i,         // memory addresses
  /(?:\/[\w.-]+){3,}/,           // deep unix paths (/a/b/c/d)
  /[A-Za-z]:\\[\w\\.-]+/,        // windows paths
  /:\d{1,5}:\d{1,5}\b/,          // :line:col
  /\bat\s+\w[\w$.<>]*\s*\(/,     // stack frames "at foo ("
  /\n\s*at\s+/,                  // multi-line stack trace
];

/**
 * Low-level technical markers that should never be shown to an end user.
 */
const TECHNICAL_MARKERS = [
  'http error',
  'status:',
  'stack trace',
  'typeerror',
  'referenceerror',
  'syntaxerror',
  'rangeerror',
  'mongoservererror',
  'mongoerror',
  'mongoose',
  'econnrefused',
  'econnreset',
  'enotfound',
  'etimedout',
  'undefined is not',
  'cannot read prop',
  'is not a function',
  'unexpected token',
  'e11000',
  'validationerror:',
  'jsonwebtokenerror',
  'tokenexpirederror',
  'prisma',
  'sql',
  'fetch failed',
  'at object.',
  'at async',
  'exception',
  'unhandled',
  'debug:',
  'trace:',
];

/**
 * True when the string looks like a raw developer/technical error we should NOT show.
 * Examples: "HTTP error! status: 500", "TypeError: ...", "MongoServerError: ...", "ECONNREFUSED".
 *
 * Heuristics (conservative — err on the side of hiding):
 *   - Empty or excessively long strings (>120 chars) are assumed technical.
 *   - Strings containing stack-trace / path / memory-address patterns are technical.
 *   - Strings containing known technical markers are technical.
 */
function looksTechnical(message: string): boolean {
  if (!message) return true;
  const m = message.trim();
  if (m.length === 0) return true;
  // Friendly user-facing messages are almost always short. Long strings are
  // typically stack traces, stringified objects, or wrapped SDK errors.
  if (m.length > 120) return true;

  if (TECHNICAL_PATTERNS.some(pattern => pattern.test(m))) return true;

  const lower = m.toLowerCase();
  return TECHNICAL_MARKERS.some(marker => lower.includes(marker));
}

/**
 * Convert any thrown error into a safe, user-friendly message.
 *
 * Precedence:
 *   1. API response objects with a known `errorType` → canonical message from errorMessages.ts
 *   2. ApiError instances → canonical message from errorMessages.ts (via error.code)
 *   3. Vetted string `message` from our API (short, non-technical) → pass through
 *   4. Network / offline errors → NETWORK_ERROR message
 *   5. Anything else → the provided fallback (or the generic default)
 */
export function getUserFriendlyMessage(
  error: unknown,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (error == null) return fallback;

  // Object form: API responses we've already parsed, or structured payloads
  if (typeof error === 'object') {
    const payload = error as ApiErrorResponseShape & { name?: string; code?: string };

    // 1. Prefer explicit errorType lookup — this is the canonical path.
    if (payload.errorType && ERROR_MESSAGES[payload.errorType]) {
      return getErrorConfig(payload.errorType).message;
    }

    // 2. ApiError instance thrown from lib/errors/ApiError.ts
    if (error instanceof ApiError) {
      if (ERROR_MESSAGES[error.code]) {
        return getErrorConfig(error.code).message;
      }
      // Fall through to generic — never leak error.message for unknown codes
      return fallback;
    }

    // 3. Vetted `message` from our own API (e.g. "Invalid username or password")
    const msg = payload.message || payload.error;
    if (typeof msg === 'string' && msg.length > 0 && !looksTechnical(msg)) {
      return msg;
    }

    // 4. Network errors surface as TypeError from fetch
    if (error instanceof Error) {
      const lower = error.message.toLowerCase();
      if (NETWORK_HINTS.some(hint => lower.includes(hint))) {
        return getErrorConfig('NETWORK_ERROR').message;
      }
    }

    return fallback;
  }

  // String form (rare — but someone might `throw 'oops'`)
  if (typeof error === 'string') {
    if (!looksTechnical(error)) return error;
    return fallback;
  }

  return fallback;
}

/**
 * Parse an API error response body into a user-friendly message.
 *
 * Use after a `fetch()` call where `!response.ok`. Safely handles:
 *   - JSON bodies with { errorType } → canonical message
 *   - JSON bodies with { message } or { error } (if non-technical) → pass through
 *   - Empty / non-JSON bodies → fallback
 *
 * Example:
 *   if (!res.ok) {
 *     setError(await extractApiErrorMessage(res, 'Unable to load notes.'));
 *     return;
 *   }
 */
export async function extractApiErrorMessage(
  response: Response,
  fallback: string = DEFAULT_FALLBACK
): Promise<string> {
  try {
    const body = await response.clone().json();
    return getUserFriendlyMessage(body, fallback);
  } catch {
    // Body was empty or non-JSON — fall back to status-based guess
    if (response.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (response.status >= 500) {
      return fallback;
    }
    if (response.status === 401 || response.status === 403) {
      return 'You are not authorized to perform this action.';
    }
    return fallback;
  }
}
