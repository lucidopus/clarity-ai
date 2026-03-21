'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useScribe } from '@elevenlabs/react';
import {
  saveSegment,
  getUnsyncedSegments,
  markSegmentsSynced,
  saveActiveSession,
  updateSessionNotes,
  addMarkerToSession,
  type StoredSession,
} from './indexeddb';

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

interface UseLiveTranscriptionConfig {
  sessionId: string;
  token: string;
  title: string;
  audioSource: 'mic' | 'system';
  contextDocIds: string[];
  onSilenceTimeout?: () => void;
  onError?: (error: string) => void;
}

interface UseLiveTranscriptionReturn {
  segments: TranscriptSegment[];
  isConnected: boolean;
  isListening: boolean;
  elapsed: number;
  error: string | null;
  focusNotes: string;
  markers: ImportanceMarker[];
  start: () => Promise<void>;
  stop: () => void;
  setFocusNotes: (notes: string) => void;
  addMarker: (notePosition?: number) => void;
}

const SYNC_INTERVAL = 10_000; // 10 seconds
const HEARTBEAT_INTERVAL = 15_000; // 15 seconds
const SILENCE_TIMEOUT = 600_000; // 10 minutes

export function useLiveTranscription(config: UseLiveTranscriptionConfig): UseLiveTranscriptionReturn {
  const { sessionId, token, title, audioSource, contextDocIds, onSilenceTimeout, onError } = config;

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [focusNotes, setFocusNotesState] = useState('');
  const [markers, setMarkers] = useState<ImportanceMarker[]>([]);

  const startTimeRef = useRef<number>(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const focusNotesRef = useRef('');
  const markersRef = useRef<ImportanceMarker[]>([]);
  const pendingMarkersRef = useRef<ImportanceMarker[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    focusNotesRef.current = focusNotes;
  }, [focusNotes]);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      onSilenceTimeout?.();
    }, SILENCE_TIMEOUT);
  }, [onSilenceTimeout]);

  const scribe = useScribe({
    onConnect: () => {
      console.log('🎙️ [SCRIBE] Connected');
    },
    onDisconnect: () => {
      console.log('🎙️ [SCRIBE] Disconnected');
    },
    onError: (err) => {
      console.error('🎙️ [SCRIBE] Error:', err);
      const msg = typeof err === 'string' ? err : 'Transcription error';
      setError(msg);
      onError?.(msg);
    },
    onCommittedTranscript: (data) => {
      const now = Date.now();
      const offsetSeconds = (now - startTimeRef.current) / 1000;

      const segment: TranscriptSegment = {
        text: data.text,
        startOffset: Math.max(0, offsetSeconds - 3), // approximate
        endOffset: offsetSeconds,
        committedAt: new Date().toISOString(),
      };

      // Layer 1: React state
      setSegments(prev => [...prev, segment]);

      // Layer 2: IndexedDB (async, fire-and-forget)
      saveSegment({
        sessionId,
        text: segment.text,
        startOffset: segment.startOffset,
        endOffset: segment.endOffset,
        committedAt: segment.committedAt,
        synced: false,
      }).catch(err => console.error('IndexedDB save failed:', err));

      // Reset silence timer on any committed transcript
      resetSilenceTimer();
    },
  });

  // Sync to MongoDB every 10 seconds
  const syncToServer = useCallback(async () => {
    try {
      const unsyncedSegments = await getUnsyncedSegments(sessionId);
      if (unsyncedSegments.length === 0 && pendingMarkersRef.current.length === 0 && !focusNotesRef.current) {
        return;
      }

      const newSegments = unsyncedSegments.map(s => ({
        text: s.text,
        startOffset: s.startOffset,
        endOffset: s.endOffset,
        committedAt: new Date(s.committedAt),
      }));

      const response = await fetch('/api/live-lecture/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          newSegments: newSegments.length > 0 ? newSegments : undefined,
          focusNotes: focusNotesRef.current || undefined,
          newMarkers: pendingMarkersRef.current.length > 0 ? pendingMarkersRef.current : undefined,
        }),
      });

      if (response.ok) {
        // Mark synced in IndexedDB
        const ids = unsyncedSegments
          .map(s => s.id)
          .filter((id): id is number => id !== undefined);
        if (ids.length > 0) {
          await markSegmentsSynced(ids);
        }
        // Clear pending markers
        pendingMarkersRef.current = [];
      }
    } catch (err) {
      console.error('❌ [SYNC] Failed:', err);
    }
  }, [sessionId]);

  // Heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch('/api/live-lecture/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // Heartbeat failure is non-critical
    }
  }, [sessionId]);

  const start = useCallback(async () => {
    try {
      startTimeRef.current = Date.now();
      setError(null);

      // Save session to IndexedDB for crash recovery
      const storedSession: StoredSession = {
        sessionId,
        title,
        audioSource,
        startedAt: new Date().toISOString(),
        focusNotes: '',
        importanceMarkers: [],
        contextDocIds,
        token,
      };
      await saveActiveSession(storedSession);

      // Get audio stream
      let stream: MediaStream;
      if (audioSource === 'system') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        // Stop video tracks — we only need audio
        stream.getVideoTracks().forEach(track => track.stop());

        if (stream.getAudioTracks().length === 0) {
          throw new Error('No system audio available. Make sure to share a tab or screen with audio.');
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      mediaStreamRef.current = stream;

      // Listen for track ended (e.g., user stops screen share)
      stream.getAudioTracks().forEach(track => {
        track.addEventListener('ended', () => {
          setError('Audio source was disconnected');
          onError?.('Audio source was disconnected');
        });
      });

      // Connect to ElevenLabs Scribe
      await scribe.connect({ token });
      setIsListening(true);

      // Start elapsed timer
      elapsedIntervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Start sync interval (Layer 3)
      syncIntervalRef.current = setInterval(syncToServer, SYNC_INTERVAL);

      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

      // Start silence timer
      resetSilenceTimer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start transcription';
      setError(msg);
      onError?.(msg);
    }
  }, [sessionId, token, title, audioSource, contextDocIds, scribe, syncToServer, sendHeartbeat, resetSilenceTimer, onError]);

  const stop = useCallback(() => {
    // Stop scribe
    scribe.disconnect();
    setIsListening(false);

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Clear all intervals
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    syncIntervalRef.current = null;
    heartbeatIntervalRef.current = null;
    elapsedIntervalRef.current = null;
    silenceTimerRef.current = null;

    // Final sync
    syncToServer();
  }, [scribe, syncToServer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const setFocusNotes = useCallback((notes: string) => {
    setFocusNotesState(notes);
    // Update IndexedDB
    updateSessionNotes(sessionId, notes).catch(() => {});
  }, [sessionId]);

  const addMarker = useCallback((notePosition?: number) => {
    const offsetSeconds = (Date.now() - startTimeRef.current) / 1000;
    const marker: ImportanceMarker = {
      offsetSeconds,
      notePosition,
      createdAt: new Date().toISOString(),
    };

    setMarkers(prev => [...prev, marker]);
    pendingMarkersRef.current.push(marker);

    // Save to IndexedDB
    addMarkerToSession(sessionId, marker).catch(() => {});
  }, [sessionId]);

  return {
    segments,
    isConnected: scribe.isConnected,
    isListening,
    elapsed,
    error,
    focusNotes,
    markers,
    start,
    stop,
    setFocusNotes,
    addMarker,
  };
}
