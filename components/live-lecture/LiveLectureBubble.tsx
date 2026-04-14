'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Minimize2, Square, Loader2, ExternalLink, Lightbulb, Sparkles, BookOpen, HelpCircle, ListChecks, Star } from 'lucide-react';
import { ToastContainer, type ToastType } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import { useLiveLecture } from '@/lib/live-lecture/LiveLectureContext';
import { useScribe } from '@elevenlabs/react';
import {
  saveSegment,
  getUnsyncedSegments,
  markSegmentsSynced,
  saveActiveSession,
  updateSessionNotes,
  addMarkerToSession,
} from '@/lib/live-lecture/indexeddb';
import NotesTab from './NotesTab';
import ClaraTab from './ClaraTab';
import EndLectureDialog from './EndLectureDialog';
import LiveLectureSetupModal from './LiveLectureSetupModal';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const SYNC_INTERVAL = 10_000;

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TranscriptStream({ segments, partialText, markers }: { segments: Array<{ text: string; startOffset: number; endOffset: number }>; partialText: string; markers: Array<{ offsetSeconds: number }> }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments.length, partialText]);

  // Check if a segment has been marked important
  const isMarked = useCallback((seg: { startOffset: number; endOffset: number }) => {
    return markers.some(m => m.offsetSeconds >= seg.startOffset && m.offsetSeconds <= seg.endOffset);
  }, [markers]);

  if (segments.length === 0 && !partialText) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
          <Mic className="w-5 h-5 text-accent/40" />
        </div>
        <p className="text-sm text-muted-foreground/60">Waiting for speech...</p>
        <p className="text-xs text-muted-foreground/40 mt-1">Transcript will appear here as you speak.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-0.5">
      {segments.map((seg, i) => {
        const marked = isMarked(seg);
        return (
          <div key={i} className={`group flex gap-3 py-1.5 ${marked ? 'bg-amber-500/8 -mx-2 px-2 rounded-md border-l-2 border-amber-400/60' : ''}`}>
            <span className={`text-[11px] font-mono shrink-0 w-10 text-right pt-0.5 transition-colors ${marked ? 'text-amber-400' : 'text-muted-foreground/40 group-hover:text-muted-foreground'}`}>
              {formatTimestamp(seg.startOffset)}
            </span>
            <span className="text-sm text-foreground/80 leading-relaxed flex-1">{seg.text}</span>
            {marked && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
          </div>
        );
      })}
      {/* Live partial transcript — streams word by word before commit */}
      {partialText && (
        <div className="flex gap-3 py-1.5">
          <span className="text-[11px] font-mono text-muted-foreground/40 shrink-0 w-10 text-right pt-0.5 animate-pulse">
            ···
          </span>
          <span className="text-sm text-foreground/60 leading-relaxed">
            {partialText}
            <span className="inline-block w-0.5 h-4 bg-foreground/40 animate-pulse ml-0.5 align-middle" />
          </span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

export default function LiveLectureBubble() {
  const router = useRouter();
  const ctx = useLiveLecture();
  const {
    phase, sessionId, token, config,
    focusNotes, markers, elapsed, error,
    sourceId, staleSessionId,
    recovering, recoveryData,
    closeSetup, startSession, resumeSession, endSession, endSessionById,
    forceEndAndRetry,
    dismissRecovery,
    addSegment,
    setIsConnected, setElapsed, setError,
    setPhase, setSourceId,
  } = ctx;

  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'clara' | 'transcript'>('notes');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [isResuming, setIsResuming] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: ToastType }>>([]);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scribeConnectedRef = useRef(false);
  const isMutedRef = useRef(false);
  const focusNotesRef = useRef('');
  const pendingMarkersRef = useRef<typeof markers>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    setToasts(prev => [...prev, { id: `${Date.now()}_${Math.random()}`, message, type }]);
  }, []);
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Keep refs in sync
  useEffect(() => { focusNotesRef.current = focusNotes; }, [focusNotes]);
  useEffect(() => {
    // Track new markers as pending for sync
    if (markers.length > 0) {
      const latest = markers[markers.length - 1];
      pendingMarkersRef.current.push(latest);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers.length]);

  // Listen for tab switch events (quick prompts switch to Clara)
  useEffect(() => {
    const switchToClara = () => {
      setActiveTab('clara');
      setExpanded(true);
    };
    window.addEventListener('live-lecture-switch-to-clara', switchToClara);
    window.addEventListener('live-lecture-explain-last-2-min', switchToClara);
    return () => {
      window.removeEventListener('live-lecture-switch-to-clara', switchToClara);
      window.removeEventListener('live-lecture-explain-last-2-min', switchToClara);
    };
  }, []);

  // Sync to MongoDB
  const syncToServer = useCallback(async () => {
    if (!sessionId) return;
    try {
      const unsynced = await getUnsyncedSegments(sessionId);
      const newSegments = unsynced.map(s => ({
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
        const ids = unsynced.map(s => s.id).filter((id): id is number => id !== undefined);
        if (ids.length > 0) await markSegmentsSynced(ids);
        pendingMarkersRef.current = [];
      }
    } catch (err) {
      console.error('❌ [SYNC] Failed:', err);
      addToast('Failed to sync transcript', 'warning');
    }
  }, [sessionId, addToast]);

  // ElevenLabs Scribe hook
  const scribe = useScribe({
    onConnect: () => { scribeConnectedRef.current = true; setIsConnected(true); },
    onDisconnect: () => { scribeConnectedRef.current = false; setIsConnected(false); },
    onError: (err) => {
      const msg = typeof err === 'string' ? err : 'Transcription error';
      setError(msg);
    },
    onPartialTranscript: (data) => {
      setPartialText(data.text || '');
    },
    onCommittedTranscript: (data) => {
      setPartialText(''); // Clear partial — it's now committed
      if (!data.text || !data.text.trim()) return; // Skip empty commits (noise gate artifacts)
      const now = Date.now();
      const offsetSeconds = (now - (ctx.startedAt || now)) / 1000;

      const segment = {
        text: data.text,
        startOffset: Math.max(0, offsetSeconds - 3),
        endOffset: offsetSeconds,
        committedAt: new Date().toISOString(),
      };

      addSegment(segment);

      // IndexedDB (Layer 2)
      if (sessionId) {
        saveSegment({
          sessionId,
          ...segment,
          synced: false,
        }).catch(() => {});
      }

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // 10 min without audio — silence detected
      }, 600_000);
    },
  });

  // Start transcription when phase becomes 'active'
  useEffect(() => {
    if (phase !== 'active' || !token || !config || !sessionId) return;

    let cancelled = false;

    async function connect() {
      try {
        // Only save fresh session to IndexedDB if not resuming
        if (!isResuming) {
          await saveActiveSession({
            sessionId: sessionId!,
            title: config!.title,
            audioSource: config!.audioSource,
            startedAt: new Date().toISOString(),
            focusNotes: '',
            importanceMarkers: [],
            contextDocIds: config!.contextDocIds,
            token: token!,
          });
        }
        setIsResuming(false);

        if (cancelled) return;

        // Capture audio stream
        let stream: MediaStream;
        if (config!.audioSource === 'system') {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          stream.getVideoTracks().forEach(track => track.stop());
          if (stream.getAudioTracks().length === 0) {
            throw new Error('No system audio available. Make sure to share a tab with audio.');
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        }

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        mediaStreamRef.current = stream;

        stream.getAudioTracks().forEach(track => {
          track.addEventListener('ended', () => {
            setError('Audio source was disconnected');
            addToast('Audio source was disconnected', 'error');
          });
        });

        // Connect scribe in manual PCM mode (gives us mute control)
        await scribe.connect({
          token: token!,
          modelId: 'scribe_v2_realtime',
          audioFormat: 'pcm_16000' as import('@elevenlabs/react').AudioFormat,
          sampleRate: 16000,
        });

        if (cancelled) { scribe.disconnect(); stream.getTracks().forEach(t => t.stop()); return; }

        // Set up AudioContext to capture PCM and send to scribe
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
          if (!scribeConnectedRef.current) return; // Guard: skip if WS not ready

          const inputData = event.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(inputData.length);

          if (isMutedRef.current) {
            // Muted — send silent frames to keep WebSocket alive
            // int16 is already zero-filled by default
          } else {
            // Noise gate: calculate RMS amplitude — skip ambient noise
            let sumSquares = 0;
            for (let i = 0; i < inputData.length; i++) {
              sumSquares += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sumSquares / inputData.length);
            if (rms < 0.005) return; // Below threshold — don't send to Scribe

            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
          }

          const bytes = new Uint8Array(int16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          scribe.sendAudio(btoa(binary), { sampleRate: 16000 });
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        audioContextRef.current = audioContext;

        // Start elapsed timer (uses ctx.startedAt from context — correct for both new & resumed sessions)
        const sessionStartedAt = ctx.startedAt || Date.now();
        elapsedIntervalRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - sessionStartedAt) / 1000));
        }, 1000);

        // Start sync interval
        syncIntervalRef.current = setInterval(syncToServer, SYNC_INTERVAL);

        setExpanded(true);
        addToast(isResuming ? 'Session resumed successfully' : 'Clara is now listening', 'success');
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to connect';
          setError(msg);
          addToast(msg, 'error');

          // Mark the session as interrupted so it doesn't block future attempts
          if (sessionId) {
            fetch('/api/live-lecture/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, markInterrupted: true }),
            }).catch(() => {});
          }

          setPhase('setup');
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, token, sessionId]);

  // Cleanup on unmount or phase change away from active
  useEffect(() => {
    if (phase === 'active') return;

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [phase]);

  // Save notes to IndexedDB on change
  useEffect(() => {
    if (sessionId && phase === 'active') {
      updateSessionNotes(sessionId, focusNotes).catch(() => {});
    }
  }, [focusNotes, sessionId, phase]);

  // Save markers to IndexedDB + show toast
  useEffect(() => {
    if (sessionId && phase === 'active' && markers.length > 0) {
      const latest = markers[markers.length - 1];
      addMarkerToSession(sessionId, latest).catch(() => {});
      addToast('Moment marked as important', 'success');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers.length, sessionId, phase]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    isMutedRef.current = newMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      setPartialText(''); // Clear stale partial when muting
    }
    addToast(newMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
  }, [isMuted, addToast]);

  const handleEnd = useCallback(async () => {
    setIsEnding(true);

    // Save any partial transcript as a final segment before disconnecting
    if (partialText.trim() && sessionId) {
      const now = Date.now();
      const offsetSeconds = (now - (ctx.startedAt || now)) / 1000;
      const finalSegment = {
        text: partialText.trim(),
        startOffset: Math.max(0, offsetSeconds - 3),
        endOffset: offsetSeconds,
        committedAt: new Date().toISOString(),
      };
      addSegment(finalSegment);
      saveSegment({ sessionId, ...finalSegment, synced: false }).catch(() => {});
      setPartialText('');
    }

    // Stop scribe + media + audio context
    scribe.disconnect();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    // Clear intervals
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    // Final sync before ending
    await syncToServer();

    // End session via API
    const result = await endSession();

    setIsEnding(false);
    setShowEndDialog(false);

    if (result?.sourceId) {
      addToast('Session ended — generating materials...', 'success');
      router.push(`/generations/${result.sourceId}`);
    } else {
      addToast('Session ended', 'info');
    }
  }, [scribe, syncToServer, endSession, partialText, sessionId, addSegment, router, ctx.startedAt, addToast]);

  const handleDiscard = useCallback(async () => {
    // Stop everything
    scribe.disconnect();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    // Mark as interrupted on server
    if (sessionId) {
      fetch('/api/live-lecture/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, markInterrupted: true }),
      }).catch(() => {});
      const { clearSession: clearIDB } = await import('@/lib/live-lecture/indexeddb');
      await clearIDB(sessionId);
    }

    setShowEndDialog(false);
    addToast('Session discarded', 'info');
    setPhase('idle');
  }, [scribe, sessionId, setPhase, addToast]);

  // Poll processing status
  useEffect(() => {
    if (phase !== 'processing' || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/live-lecture/${sessionId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.processingStatus === 'completed') {
            setSourceId(data.sourceId);
            addToast('Materials are ready!', 'success');
            clearInterval(interval);
          } else if (data.processingStatus === 'failed') {
            setError('Material generation failed');
            addToast('Material generation failed', 'error');
            clearInterval(interval);
          }
        }
      } catch {
        // Non-critical
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [phase, sessionId, setSourceId, setError, addToast]);

  // Recovery dialog — shown when we detect an active session from a previous page load
  if (phase === 'idle' && recovering && recoveryData) {
    const recoverySid = recoveryData.session.sessionId;
    const recoveryTitle = recoveryData.session.title;
    const recoveryStarted = new Date(recoveryData.session.startedAt);
    const recoveryElapsed = Math.floor((Date.now() - recoveryStarted.getTime()) / 1000);
    const recoveryMins = Math.floor(recoveryElapsed / 60);

    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <motion.div
          className="relative w-full max-w-md mx-4 bg-card-bg border border-border rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Mic className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Session In Progress</h3>
                <p className="text-sm text-muted-foreground">You have an active live session</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-background rounded-xl border border-border/50">
              <div className="text-sm font-medium text-foreground">{recoveryTitle}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Started {recoveryMins > 0 ? `${recoveryMins} min ago` : 'just now'} · {recoveryData.segments.length} transcript segments captured
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-6 py-4 border-t border-border">
            <button
              onClick={async () => {
                await dismissRecovery();
                // Mark as interrupted on server
                fetch('/api/live-lecture/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId: recoverySid, markInterrupted: true }),
                }).catch(() => {});
              }}
              className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background rounded-xl transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={async () => {
                const result = await endSessionById(recoverySid);
                if (result?.sourceId) {
                  router.push(`/generations/${result.sourceId}`);
                }
              }}
              className="px-4 py-2.5 text-sm font-medium bg-background border border-border text-foreground hover:bg-background/80 rounded-xl transition-colors cursor-pointer"
            >
              End & Generate
            </button>
            <button
              onClick={() => { setIsResuming(true); resumeSession(recoverySid); }}
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-accent text-white hover:bg-accent/90 rounded-xl transition-colors cursor-pointer text-center"
            >
              Resume Session
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Don't render anything if idle
  if (phase === 'idle') {
    return (
      <>
        <LiveLectureSetupModal
          isOpen={false}
          onClose={closeSetup}
          onStart={startSession}
          externalError={error}
          staleSessionId={staleSessionId}
          onForceEndAndRetry={forceEndAndRetry}
        />
      </>
    );
  }

  // Setup modal
  if (phase === 'setup') {
    return (
      <LiveLectureSetupModal
        isOpen={true}
        onClose={closeSetup}
        onStart={startSession}
        externalError={error}
        staleSessionId={staleSessionId}
        onForceEndAndRetry={forceEndAndRetry}
      />
    );
  }

  // Connecting state
  if (phase === 'connecting') {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex items-center gap-3 px-4 py-3 bg-card-bg border border-border rounded-full shadow-xl">
          <Loader2 className="w-4 h-4 text-accent animate-spin" />
          <span className="text-sm text-foreground font-medium">Connecting to Clara...</span>
        </div>
      </div>
    );
  }

  // Processing state (post-lecture)
  if (phase === 'processing') {
    return (
      <>
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-card-bg border border-border rounded-2xl shadow-xl">
            {sourceId ? (
              <>
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-sm text-foreground font-medium">Materials ready!</span>
                <a
                  href={`/generations/${sourceId}`}
                  className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer"
                >
                  View <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setPhase('idle')}
                  className="ml-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                <span className="text-sm text-foreground font-medium">Generating materials...</span>
              </>
            )}
          </div>
        </div>
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  // Active / Ending — main bubble
  return (
    <>
      {/* ─── Collapsed Floating Pill (bottom-right) ─── */}
      <AnimatePresence>
        {!expanded && (
          <motion.button
            key="collapsed-pill"
            onClick={() => setExpanded(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-card-bg border border-border rounded-full shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Pulsing dot */}
            <div className="relative">
              {!isMuted && <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-40" />}
              <div className={`relative w-3 h-3 rounded-full ${isMuted ? 'bg-muted-foreground' : 'bg-red-500'}`} />
            </div>

            {isMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-accent" />}
            <span className="text-sm font-medium text-foreground font-mono">{formatTime(elapsed)}</span>
            <span className="text-xs text-muted-foreground">Clara</span>

            {error && (
              <span className="w-2 h-2 bg-amber-400 rounded-full" title={error} />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Expanded Centered Panel ─── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="expanded-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop — click to minimize */}
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px] cursor-pointer"
              onClick={() => setExpanded(false)}
            />

            <motion.div
              className="relative w-full max-w-4xl mx-4 h-[85vh] max-h-[860px] bg-card-bg border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  {/* Pulsing dot */}
                  <div className="relative">
                    {!isMuted && <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-40" />}
                    <div className={`relative w-2.5 h-2.5 rounded-full ${isMuted ? 'bg-muted-foreground' : 'bg-red-500'}`} />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-foreground">
                      {config?.title || 'Live Session'}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">{formatTime(elapsed)}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className={`${isMuted ? 'text-amber-400' : 'text-accent'}`}>
                        {isMuted ? 'Muted' : 'Listening'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Minimize */}
                <button
                  onClick={() => setExpanded(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                  title="Minimize to corner"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Error banner */}
              {error && (
                <div className="px-6 py-2.5 bg-red-500/10 border-b border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-border/50 px-6">
                {([
                  { key: 'notes', label: '📝 Notes' },
                  { key: 'clara', label: '💬 Clara' },
                  { key: 'transcript', label: '📜 Transcript' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`py-3 px-4 text-sm font-medium transition-colors cursor-pointer ${
                      activeTab === key
                        ? 'text-foreground border-b-2 border-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content — all mounted, toggle visibility to preserve state + event listeners */}
              <div className={`flex-1 overflow-hidden ${activeTab === 'notes' ? '' : 'hidden'}`}>
                <NotesTab />
              </div>
              <div className={`flex-1 overflow-hidden ${activeTab === 'clara' ? '' : 'hidden'}`}>
                <ClaraTab syncToServer={syncToServer} partialText={partialText} />
              </div>
              <div className={`flex-1 overflow-y-auto ${activeTab === 'transcript' ? '' : 'hidden'}`}>
                <TranscriptStream segments={ctx.segments} partialText={partialText} markers={ctx.markers} />
              </div>

              {/* Quick Prompts — always visible regardless of tab */}
              <div className="flex items-center gap-1.5 px-4 py-2 border-t border-border/30 overflow-x-auto">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('live-lecture-explain-last-2-min'));
                    setActiveTab('clara');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Lightbulb className="w-3 h-3" />
                  Explain Last 2 Min
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('live-lecture-quick-prompt', { detail: 'Summarize everything covered so far in this lecture' }));
                    setActiveTab('clara');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-card-bg/80 border border-border/50 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  Summarize
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('live-lecture-quick-prompt', { detail: 'List the key terms and definitions mentioned in this lecture so far' }));
                    setActiveTab('clara');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-card-bg/80 border border-border/50 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <BookOpen className="w-3 h-3" />
                  Key Terms
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('live-lecture-quick-prompt', { detail: 'Generate 3 quick quiz questions based on what has been covered so far' }));
                    setActiveTab('clara');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-card-bg/80 border border-border/50 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <HelpCircle className="w-3 h-3" />
                  Quiz Me
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('live-lecture-quick-prompt', { detail: 'What are the key takeaways and action items from this lecture so far?' }));
                    setActiveTab('clara');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-card-bg/80 border border-border/50 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <ListChecks className="w-3 h-3" />
                  Takeaways
                </button>
                <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground/50 shrink-0">
                  <Star className="w-3 h-3" />
                  ⌘K mark important
                </div>
              </div>

              {/* Footer — Mute + End side by side */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-border/50">
                <button
                  onClick={toggleMute}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 dark:text-amber-400'
                      : 'bg-background text-foreground border border-border hover:bg-background/80'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  onClick={() => setShowEndDialog(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  <Square className="w-3 h-3 fill-current" />
                  End Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End dialog */}
      <EndLectureDialog
        isOpen={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        onConfirm={handleEnd}
        onDiscard={handleDiscard}
        isEnding={isEnding}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
