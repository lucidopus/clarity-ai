import type { TranscriptSegment } from './types';

export function formatTimestamp(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    return null;
  } catch {
    return null;
  }
}

/** Binary search for the segment containing time `t`. Returns -1 if before first or after last. */
export function findActiveSegmentIndex(transcript: TranscriptSegment[], t: number): number {
  if (!transcript || transcript.length === 0) return -1;
  let lo = 0;
  let hi = transcript.length - 1;
  if (t < transcript[0].start) return -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = transcript[mid];
    const next = transcript[mid + 1];
    const end = next ? next.start : seg.start + (seg.duration || 0);
    if (t < seg.start) {
      hi = mid - 1;
    } else if (t >= end) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }
  return Math.min(lo, transcript.length - 1);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
