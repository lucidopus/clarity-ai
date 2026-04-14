'use client';

import { useState, useEffect } from 'react';
import {
  getActiveSession,
  getSegments,
  clearSession,
  type StoredSession,
  type StoredSegment,
} from './indexeddb';

export interface CrashRecoveryData {
  session: StoredSession;
  segments: StoredSegment[];
}

interface UseCrashRecoveryReturn {
  recovering: boolean;
  recoveryData: CrashRecoveryData | null;
  dismiss: () => Promise<void>;
}

/**
 * Checks IndexedDB on mount for an active session that may have been
 * interrupted by a page refresh or crash. If found, verifies with the
 * server that the session is still active before offering recovery.
 */
export function useCrashRecovery(): UseCrashRecoveryReturn {
  const [recovering, setRecovering] = useState(false);
  const [recoveryData, setRecoveryData] = useState<CrashRecoveryData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkRecovery() {
      try {
        const storedSession = await getActiveSession();

        if (storedSession) {
          // Local IDB has a session — verify with server
          const response = await fetch(`/api/live-lecture/${storedSession.sessionId}/status`);
          if (!response.ok || cancelled) {
            await clearSession(storedSession.sessionId);
            return;
          }

          const serverStatus = await response.json();
          if (serverStatus.status !== 'active') {
            await clearSession(storedSession.sessionId);
            return;
          }

          const segments = await getSegments(storedSession.sessionId);
          if (!cancelled) {
            setRecoveryData({ session: storedSession, segments });
            setRecovering(true);
          }
          return;
        }

        // No local session — check server for active session in another browser/device
        if (cancelled) return;
        const activeRes = await fetch('/api/live-lecture/active');
        if (!activeRes.ok || cancelled) return;

        const activeData = await activeRes.json();
        if (!activeData.session || cancelled) return;

        // Build a synthetic StoredSession — the resume flow will fetch full
        // state from the server, so empty local data is fine here.
        const synthetic: StoredSession = {
          sessionId: activeData.session.sessionId,
          title: activeData.session.title,
          audioSource: activeData.session.audioSource,
          startedAt: activeData.session.startedAt,
          focusNotes: '',
          importanceMarkers: [],
          contextDocIds: activeData.session.contextDocIds ?? [],
          token: '',
        };

        if (!cancelled) {
          setRecoveryData({ session: synthetic, segments: [] });
          setRecovering(true);
        }
      } catch {
        // Recovery check failure is non-critical — just skip
      }
    }

    checkRecovery();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = async () => {
    if (recoveryData) {
      await clearSession(recoveryData.session.sessionId);
    }
    setRecovering(false);
    setRecoveryData(null);
  };

  return { recovering, recoveryData, dismiss };
}
