export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface Chapter {
  id: string;
  timeSeconds: number;
  topic: string;
  description: string;
}

export interface SegmentNote {
  segmentId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotesShape {
  generalNote: string;
  segmentNotes: SegmentNote[];
}

export type SaveNotes = (notes: NotesShape) => Promise<void>;

export interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(time: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;
