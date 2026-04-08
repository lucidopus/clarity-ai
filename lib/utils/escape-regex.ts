/**
 * Escape special regex characters in a string for safe use in `new RegExp()`.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
