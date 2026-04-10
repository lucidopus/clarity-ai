'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  url: string;
  title?: string;
  duration?: number; // seconds, used for display before metadata loads
}

const SPEEDS = [1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ url, title, duration: hintDuration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(hintDuration ?? 0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-4">
      <audio ref={audioRef} src={url} preload="metadata" />

      {title && (
        <div className="text-sm font-medium text-foreground mb-3 truncate">{title}</div>
      )}

      {/* Scrubber */}
      <div className="mb-3">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.5}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 rounded-full accent-accent cursor-pointer"
          aria-label="Audio progress"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors cursor-pointer shrink-0"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/30 px-2 py-1 rounded-lg cursor-pointer transition-colors min-w-[42px]"
          aria-label={`Playback speed: ${SPEEDS[speedIdx]}x`}
        >
          {SPEEDS[speedIdx]}x
        </button>

        {/* Volume */}
        <div className="flex items-center gap-1.5 flex-1">
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={handleVolume}
            className="flex-1 h-1 rounded-full accent-accent cursor-pointer"
            aria-label="Volume"
          />
        </div>

        {/* Download */}
        <a
          href={url}
          download
          className="p-2 rounded-lg hover:bg-muted/20 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Download audio"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>

      {/* Progress bar visual (decorative) */}
      <div className="mt-3 h-0.5 rounded-full bg-muted/20 overflow-hidden" aria-hidden="true">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
