'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { YTPlayer } from './types';
import { YT_STATE } from './types';

interface Options {
  videoId: string;
  autoplay?: boolean;
}

interface PlayerControls {
  containerRef: React.RefObject<HTMLDivElement | null>;
  playerRef: React.RefObject<YTPlayer | null>;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setRate: (r: number) => void;
}

let apiLoadingPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiLoadingPromise) return apiLoadingPromise;

  apiLoadingPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return apiLoadingPromise;
}

interface YTPlayerExtended extends YTPlayer {
  destroy?: () => void;
}

interface YTConstructorArgs {
  width?: string | number;
  height?: string | number;
  videoId: string;
  host?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number; target: YTPlayer }) => void;
    onError?: (e: { data: number; target: YTPlayer }) => void;
  };
}

export function useYouTubePlayer({ videoId, autoplay = false }: Options): PlayerControls {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);

  useEffect(() => {
    let cancelled = false;
    if (!videoId) return;

    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;

      // Create a fresh placeholder div — YT.Player will REPLACE it with its own iframe
      const host = document.createElement('div');
      host.style.width = '100%';
      host.style.height = '100%';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(host);

      const playerVars: Record<string, string | number> = {
        controls: 0,
        cc_load_policy: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        fs: 0,
        playsinline: 1,
      };
      if (typeof window !== 'undefined') {
        playerVars.origin = window.location.origin;
      }
      if (autoplay) playerVars.autoplay = 1;

      const ctorArgs: YTConstructorArgs = {
        width: '100%',
        height: '100%',
        videoId,
        playerVars,
        events: {
          onReady: (e) => {
            if (cancelled) return;
            setIsReady(true);
            try {
              setDuration(e.target.getDuration() || 0);
              setVolumeState(e.target.getVolume?.() ?? 100);
              setIsMuted(e.target.isMuted?.() ?? false);
              setPlaybackRateState(e.target.getPlaybackRate?.() ?? 1);
            } catch {
              // ignore
            }
          },
          onStateChange: (e) => {
            if (cancelled) return;
            if (e.data === YT_STATE.PLAYING) {
              setIsPlaying(true);
              try {
                const d = e.target.getDuration?.() ?? 0;
                if (d) setDuration(d);
              } catch {
                // ignore
              }
            } else if (e.data === YT_STATE.PAUSED || e.data === YT_STATE.ENDED) {
              setIsPlaying(false);
            }
          },
        },
      };

      // YT.Player(element, options) — element is the placeholder div, gets replaced
      // by an iframe controlled by the API.
      const Ctor = window.YT.Player as unknown as new (
        el: HTMLElement,
        opts: YTConstructorArgs
      ) => YTPlayer;
      playerRef.current = new Ctor(host, ctorArgs);
    });

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        const player = playerRef.current as YTPlayerExtended | null;
        player?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
      setIsReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // rAF loop — only ticks while playing & tab visible
  useEffect(() => {
    if (!isReady || !isPlaying) return;

    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function' && !document.hidden) {
        try {
          const t = p.getCurrentTime();
          setCurrentTime(t);
          if (!duration) {
            const d = p.getDuration?.() ?? 0;
            if (d) setDuration(d);
          }
        } catch {
          // ignore
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isReady, isPlaying, duration]);

  const play = useCallback(() => {
    try {
      playerRef.current?.playVideo();
    } catch {
      // ignore
    }
  }, []);

  const pause = useCallback(() => {
    try {
      playerRef.current?.pauseVideo();
    } catch {
      // ignore
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback((seconds: number) => {
    try {
      playerRef.current?.seekTo(Math.max(0, seconds), true);
      setCurrentTime(seconds);
    } catch {
      // ignore
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    try {
      playerRef.current?.setVolume(clamped);
      setVolumeState(clamped);
      if (clamped > 0 && isMuted) {
        playerRef.current?.unMute();
        setIsMuted(false);
      }
    } catch {
      // ignore
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    try {
      const p = playerRef.current;
      if (!p) return;
      if (isMuted) {
        p.unMute();
        setIsMuted(false);
      } else {
        p.mute();
        setIsMuted(true);
      }
    } catch {
      // ignore
    }
  }, [isMuted]);

  const setRate = useCallback((r: number) => {
    try {
      playerRef.current?.setPlaybackRate(r);
      setPlaybackRateState(r);
    } catch {
      // ignore
    }
  }, []);

  return {
    containerRef,
    playerRef,
    isReady,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setRate,
  };
}
