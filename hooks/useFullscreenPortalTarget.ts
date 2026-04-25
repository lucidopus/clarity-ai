'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the right portal target for an overlay/modal so it stays visible
 * when an ancestor enters browser fullscreen.
 *
 * The Fullscreen API only paints descendants of the fullscreen element. A
 * modal portaled to `document.body` would render outside that subtree and
 * the user would see nothing until they exit fullscreen. Subscribing to
 * `fullscreenchange` (with vendor-prefix fallbacks for older Safari/iOS)
 * keeps the portal target in sync as the user toggles in and out.
 *
 * Returns `null` on the very first render (pre-mount) so callers can guard
 * `if (!portalTarget) return null;` and avoid SSR/hydration churn.
 */
export function useFullscreenPortalTarget(): Element | null {
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    type FSDoc = Document & {
      webkitFullscreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    const doc = document as FSDoc;
    const resolve = () =>
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.msFullscreenElement ||
      document.body;
    const update = () => setTarget(resolve());
    update();
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    document.addEventListener('msfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
      document.removeEventListener('msfullscreenchange', update);
    };
  }, []);

  return target;
}
