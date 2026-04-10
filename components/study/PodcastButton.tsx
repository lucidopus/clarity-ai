'use client';

import { useState, useEffect } from 'react';
import { Headphones, Loader2, Lock } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

interface PodcastData {
  available: boolean;
  url?: string;
  duration?: number;
  generatedAt?: string;
}

interface PodcastButtonProps {
  sourceId: string;
  sourceTitle?: string;
}

export default function PodcastButton({ sourceId, sourceTitle }: PodcastButtonProps) {
  const [data, setData] = useState<PodcastData | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  useEffect(() => {
    if (!sourceId) return;
    fetch(`/api/audio/podcast/${sourceId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ available: false }));
  }, [sourceId]);

  if (!data) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm cursor-not-allowed opacity-60"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking podcast...
      </button>
    );
  }

  if (data.available && data.url) {
    return (
      <div>
        {!playerOpen ? (
          <button
            onClick={() => setPlayerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors cursor-pointer"
          >
            <Headphones className="w-4 h-4" />
            Listen to Study Podcast
          </button>
        ) : (
          <AudioPlayer
            url={data.url}
            title={sourceTitle ? `${sourceTitle} — Study Podcast` : 'Study Podcast'}
            duration={data.duration}
          />
        )}
      </div>
    );
  }

  // Podcast not yet generated — show as a premium teaser
  return (
    <button
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:border-accent/50 hover:text-foreground transition-colors cursor-pointer"
      onClick={() => {
        // Placeholder: will trigger generation or show paywall in P6
        alert('Study Podcast generation is a coming Pro feature. Stay tuned!');
      }}
    >
      <Headphones className="w-4 h-4" />
      Study Podcast
      <Lock className="w-3.5 h-3.5 ml-auto opacity-50" />
    </button>
  );
}
