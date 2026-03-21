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
        if (!storedSession || cancelled) return;

        // Check if session is still active on server
        const response = await fetch(`/api/live-lecture/${storedSession.sessionId}/status`);
        if (!response.ok || cancelled) {
          // Session doesn't exist on server or request failed — clean up
          await clearSession(storedSession.sessionId);
          return;
        }

        const serverStatus = await response.json();
        if (serverStatus.status !== 'active') {
          // Session already ended — clean up
          await clearSession(storedSession.sessionId);
          return;
        }

        // Session is still active — offer recovery
        const segments = await getSegments(storedSession.sessionId);
        if (!cancelled) {
          setRecoveryData({ session: storedSession, segments });
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
