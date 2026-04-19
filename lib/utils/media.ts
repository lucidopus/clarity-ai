/**
 * Secure-context helpers for navigator.mediaDevices.
 *
 * iOS Safari (and older Chromium builds) does NOT expose `mediaDevices` on
 * non-secure origins — tapping voice/mic features over `http://<lan-ip>:3000`
 * crashes with `TypeError: undefined is not an object`. These helpers let
 * callers short-circuit and render a graceful "mic unavailable" state instead.
 */

export function hasMediaDevices(): boolean {
  if (typeof navigator === 'undefined') return false;
  const md = navigator.mediaDevices;
  return !!(md && typeof md.getUserMedia === 'function');
}

export function hasDisplayCapture(): boolean {
  if (typeof navigator === 'undefined') return false;
  const md = navigator.mediaDevices;
  return !!(md && typeof md.getDisplayMedia === 'function');
}

export const MEDIA_UNAVAILABLE_MESSAGE =
  'Microphone access needs a secure connection. Open this site over https to enable voice features.';
