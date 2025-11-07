"use client";

import { useDashboardInsights } from '@/hooks/useDashboardInsights';
import { Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function VideoEngagementList() {
  const { insights, loading, error } = useDashboardInsights();
  const router = useRouter();

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-32"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-16 h-12 bg-secondary/20 rounded animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse"></div>
                <div className="h-3 bg-secondary/10 rounded animate-pulse w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Videos</h3>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (!insights || insights.videoEngagement.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Videos</h3>
        <div className="text-sm text-muted-foreground text-center py-12">
          No video interactions yet. Generate materials to see your top videos!
        </div>
      </div>
    );
  }

  const videos = insights.videoEngagement;

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-2">Top Videos</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Your most engaged videos (last 30 days)
      </p>

      <div className="space-y-3">
        {videos.map((video, index) => (
          <button
            key={video.videoId}
            onClick={() => router.push(`/generations/${video.videoId}`)}
            className="w-full group"
          >
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors">
              {/* Rank badge */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
                {index + 1}
              </div>

              {/* Thumbnail */}
              <div className="relative w-20 h-14 flex-shrink-0 bg-secondary/20 rounded overflow-hidden">
                {video.thumbnail ? (
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                  {video.title}
                </h4>

                {/* Progress bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${video.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {video.interactions} {video.interactions === 1 ? 'interaction' : 'interactions'}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
        <p>
          💡 <strong>Tip:</strong> Click any video to open its materials and continue learning
        </p>
      </div>
    </div>
  );
}
