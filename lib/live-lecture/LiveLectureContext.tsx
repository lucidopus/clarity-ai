'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useCrashRecovery, type CrashRecoveryData } from './use-crash-recovery';
import { clearSession } from './indexeddb';
import type { LiveLectureConfig } from '@/components/live-lecture/LiveLectureSetupModal';

export type LiveLecturePhase = 'idle' | 'setup' | 'connecting' | 'active' | 'ending' | 'processing';

export interface TranscriptSegment {
  text: string;
  startOffset: number;
  endOffset: number;
  committedAt: string;
}

export interface ImportanceMarker {
  offsetSeconds: number;
  notePosition?: number;
  createdAt: string;
}

interface LiveLectureState {
  phase: LiveLecturePhase;
  sessionId: string | null;
  token: string | null;
  config: LiveLectureConfig | null;
  segments: TranscriptSegment[];
  focusNotes: string;
  markers: ImportanceMarker[];
  elapsed: number;
  isConnected: boolean;
  error: string | null;
  staleSessionId: string | null; // set when startSession returns 409 STALE_SESSION
  sourceId: string | null; // post-lecture
  questionCount: number;
  startedAt: number; // epoch ms of session start (for elapsed/offset calculations)
  // Crash recovery
  recoveryData: CrashRecoveryData | null;
  recovering: boolean;
}

interface LiveLectureActions {
  openSetup: () => void;
  closeSetup: () => void;
  startSession: (config: LiveLectureConfig) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  endSession: () => Promise<{ sourceId?: string } | void>;
  endSessionById: (sessionId: string) => Promise<{ sourceId?: string } | void>;
  forceEndAndRetry: (config: LiveLectureConfig) => Promise<void>;
  setFocusNotes: (notes: string) => void;
  addMarker: (notePosition?: number) => void;
  addSegment: (segment: TranscriptSegment) => void;
  setIsConnected: (connected: boolean) => void;
  setElapsed: (seconds: number) => void;
  setError: (error: string | null) => void;
  incrementQuestionCount: () => void;
  dismissRecovery: () => Promise<void>;
  setPhase: (phase: LiveLecturePhase) => void;
  setSourceId: (id: string) => void;
}

type LiveLectureContextType = LiveLectureState & LiveLectureActions;

const LiveLectureContext = createContext<LiveLectureContextType | null>(null);

export function useLiveLecture(): LiveLectureContextType {
  const ctx = useContext(LiveLectureContext);
  if (!ctx) throw new Error('useLiveLecture must be used within LiveLectureProvider');
  return ctx;
}

export function LiveLectureProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<LiveLecturePhase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [config, setConfig] = useState<LiveLectureConfig | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [focusNotes, setFocusNotesState] = useState('');
  const [markers, setMarkers] = useState<ImportanceMarker[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleSessionId, setStaleSessionId] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  const startTimeRef = useRef<number>(0);

  // Crash recovery
  const { recovering, recoveryData, dismiss: dismissCrashRecovery } = useCrashRecovery();

  // Favicon pulse when active + tab backgrounded
  useEffect(() => {
    if (phase !== 'active') return;

    const originalTitle = document.title;
    let interval: NodeJS.Timeout | null = null;

    const handleVisibility = () => {
      if (document.hidden && phase === 'active') {
        let show = true;
        interval = setInterval(() => {
          document.title = show ? '🔴 Clara is listening...' : originalTitle;
          show = !show;
        }, 2000);
      } else {
        if (interval) clearInterval(interval);
        document.title = originalTitle;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (interval) clearInterval(interval);
      document.title = originalTitle;
    };
  }, [phase]);

  const openSetup = useCallback(() => setPhase('setup'), []);
  const closeSetup = useCallback(() => setPhase('idle'), []);

  const startSession = useCallback(async (cfg: LiveLectureConfig) => {
    setPhase('connecting');
    setConfig(cfg);
    setError(null);
    setStaleSessionId(null);

    try {
      const response = await fetch('/api/live-lecture/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cfg.title,
          audioSource: cfg.audioSource,
          contextDocIds: cfg.contextDocIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        // Stale-session surface: keep the user on the setup modal so they can
        // pick "End Previous & Start New" rather than staring at a dead error.
        if (response.status === 409 && data?.errorType === 'STALE_SESSION') {
          setStaleSessionId(data.staleSessionId ?? null);
          setError(data.error || "You have a previous session that wasn't ended properly.");
          setPhase('setup');
          return;
        }
        throw new Error(data?.error || 'Failed to start session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setToken(data.token);
      startTimeRef.current = Date.now();
      setSegments([]);
      setFocusNotesState('');
      setMarkers([]);
      setElapsed(0);
      setQuestionCount(0);
      setSourceId(null);
      setPhase('active');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      setError(msg);
      setPhase('setup');
    }
  }, []);

  const forceEndAndRetry = useCallback(async (cfg: LiveLectureConfig) => {
    try {
      await fetch('/api/live-lecture/force-end', { method: 'POST' });
    } catch (err) {
      console.error('❌ [LIVE-LECTURE] force-end failed:', err);
    }
    setStaleSessionId(null);
    setError(null);
    await startSession(cfg);
  }, [startSession]);

  const resumeSession = useCallback(async (recoverySessionId: string) => {
    setPhase('connecting');
    setError(null);

    try {
      // Fetch full session data from server (notes, markers, segments, etc.)
      const [tokenRes, sessionRes] = await Promise.all([
        fetch('/api/live-lecture/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeSessionId: recoverySessionId }),
        }),
        fetch(`/api/live-lecture/${recoverySessionId}`),
      ]);

      if (!tokenRes.ok) {
        const data = await tokenRes.json();
        throw new Error(data.error || 'Failed to resume session');
      }

      const tokenData = await tokenRes.json();
      const sessionData = sessionRes.ok ? (await sessionRes.json()).session : null;

      setSessionId(tokenData.sessionId);
      setToken(tokenData.token);
      setConfig({
        title: tokenData.title,
        audioSource: tokenData.audioSource,
        contextDocIds: tokenData.contextDocIds || [],
        contextDocs: [],
      });

      // Calculate elapsed from original start time
      const startedAt = new Date(tokenData.startedAt).getTime();
      startTimeRef.current = startedAt;
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));

      // Restore previous state from server
      if (sessionData) {
        setSegments(sessionData.transcriptSegments || []);
        setFocusNotesState(sessionData.focusNotes || '');
        setMarkers(sessionData.importanceMarkers || []);
        setQuestionCount(sessionData.questionCount || 0);
      } else {
        setSegments([]);
        setFocusNotesState('');
        setMarkers([]);
        setQuestionCount(0);
      }

      setSourceId(null);
      setPhase('active');

      // Dismiss the recovery prompt
      await dismissCrashRecovery();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resume session';
      setError(msg);
      setPhase('idle');
    }
  }, [dismissCrashRecovery]);

  const endSessionById = useCallback(async (sid: string): Promise<{ sourceId?: string } | void> => {
    try {
      const response = await fetch('/api/live-lecture/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      });

      // Clean up IndexedDB
      await clearSession(sid);
      await dismissCrashRecovery();

      if (response.ok) {
        const data = await response.json();
        if (data.sourceId) {
          setSourceId(data.sourceId);
          setPhase('processing');
          setSessionId(sid);
          return { sourceId: data.sourceId };
        }
      }

      setPhase('idle');
    } catch {
      // Best effort — still dismiss recovery
      await dismissCrashRecovery();
      setPhase('idle');
    }
  }, [dismissCrashRecovery]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    setPhase('ending');

    try {
      const response = await fetch('/api/live-lecture/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          focusNotes: focusNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end session');
      }

      const data = await response.json();

      // Clean up IndexedDB
      await clearSession(sessionId);

      if (data.skipped) {
        // Too short — go back to idle
        setPhase('idle');
        setSessionId(null);
        setToken(null);
        return;
      }

      setSourceId(data.sourceId);
      setPhase('processing');

      return { sourceId: data.sourceId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to end session';
      setError(msg);
      setPhase('active'); // revert so user can try again
    }
  }, [sessionId, focusNotes]);

  const setFocusNotes = useCallback((notes: string) => {
    setFocusNotesState(notes);
  }, []);

  const addMarker = useCallback((notePosition?: number) => {
    const offsetSeconds = (Date.now() - startTimeRef.current) / 1000;
    const marker: ImportanceMarker = {
      offsetSeconds,
      notePosition,
      createdAt: new Date().toISOString(),
    };
    setMarkers(prev => [...prev, marker]);
  }, []);

  const addSegment = useCallback((segment: TranscriptSegment) => {
    setSegments(prev => [...prev, segment]);
  }, []);

  const incrementQuestionCount = useCallback(() => {
    setQuestionCount(prev => prev + 1);
  }, []);

  const dismissRecovery = useCallback(async () => {
    await dismissCrashRecovery();
  }, [dismissCrashRecovery]);

  const value: LiveLectureContextType = {
    phase,
    sessionId,
    token,
    config,
    segments,
    focusNotes,
    markers,
    elapsed,
    isConnected,
    error,
    staleSessionId,
    sourceId,
    questionCount,
    startedAt: startTimeRef.current,
    recoveryData,
    recovering,
    openSetup,
    closeSetup,
    startSession,
    resumeSession,
    endSession,
    endSessionById,
    forceEndAndRetry,
    setFocusNotes,
    addMarker,
    addSegment,
    setIsConnected,
    setElapsed,
    setError,
    incrementQuestionCount,
    dismissRecovery,
    setPhase,
    setSourceId,
  };

  return (
    <LiveLectureContext.Provider value={value}>
      {children}
    </LiveLectureContext.Provider>
  );
}
