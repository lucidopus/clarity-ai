/**
 * Ephemeral UUID generator safe for non-secure contexts (iOS Safari over
 * plain http — e.g. `http://10.0.0.11:3000` during LAN-based mobile testing —
 * does NOT expose `crypto.randomUUID`). Uses `crypto.randomUUID()` when
 * available, otherwise falls back to a Math.random + time-based v4 shim.
 *
 * ⚠️ DO NOT use this for anything persisted to the database or anything
 * security-sensitive. This is for React keys, ephemeral message IDs, and
 * similar client-side transient identifiers only. Server code should keep
 * using `crypto.randomUUID()` directly — Node's crypto is always there.
 */
export function safeRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC-4122 v4-shaped fallback. Not cryptographically secure; that's fine
  // for the client-only use cases (message id, draft source id).
  const rand = () => Math.random().toString(16).slice(2).padEnd(12, '0');
  const s = `${rand()}${rand()}${Date.now().toString(16)}`;
  return [
    s.slice(0, 8),
    s.slice(8, 12),
    `4${s.slice(13, 16)}`,
    `${((Math.random() * 4) | 0 | 8).toString(16)}${s.slice(17, 20)}`,
    s.slice(20, 32).padEnd(12, '0'),
  ].join('-');
}
