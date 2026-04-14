/**
 * API Error Response helpers
 *
 * Standardizes the JSON shape returned by API routes when they fail, so the
 * client can always map an `errorType` code to a friendly message via
 * `lib/errorMessages.ts`.
 *
 * Shape:
 *   { error: string, errorType: string }  // `error` is already user-facing
 *
 * Usage:
 *   } catch (error) {
 *     console.error('...', error);
 *     return internalServerError();
 *   }
 */
import { NextResponse } from 'next/server';
import { getErrorConfig } from '@/lib/errorMessages';

export interface ApiErrorBody {
  error: string;
  errorType: string;
}

/**
 * Build a user-facing JSON error response for a known error type.
 * The `error` string is pulled from `lib/errorMessages.ts` so it's always friendly.
 */
export function apiErrorResponse(
  errorType: string,
  status: number,
  messageOverride?: string
): NextResponse<ApiErrorBody> {
  const config = getErrorConfig(errorType);
  return NextResponse.json(
    { error: messageOverride || config.message, errorType },
    { status }
  );
}

/**
 * Shortcut for the generic server-side catch-all.
 * Use this inside a route's top-level `catch` when the error wasn't mapped to
 * a specific ApiError type.
 */
export function internalServerError(messageOverride?: string): NextResponse<ApiErrorBody> {
  return apiErrorResponse('INTERNAL_ERROR', 500, messageOverride);
}
