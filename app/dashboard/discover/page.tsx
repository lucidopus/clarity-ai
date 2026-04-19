'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Info, Loader2 } from 'lucide-react';
import CategoryRow from '@/components/CategoryRow';
import Button from '@/components/Button';
import DiscoverNavbar from '@/components/DiscoverNavbar';
import Image from 'next/image';
import VideoDetailsModal from '@/components/VideoDetailsModal';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';

interface Video {
    _id: string;
    videoId?: string;
    title: string;
    description?: string;
    summary?: string;
    thumbnail?: string;
    duration?: number;
    channelName?: string;
    tags?: string[];
    materialsStatus?: 'complete' | 'incomplete' | 'generating';
    incompleteMaterials?: string[];
    authorUsername?: string;
}

interface Category {
    name: string;
    videos: Video[];
}

export default function DiscoverPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroVideo, setHeroVideo] = useState<Video | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    async function fetchDiscoverFeed() {
        try {
            setLoading(true);
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const res = await fetch(`/api/discover?tz=${encodeURIComponent(tz)}`);
            const data = await res.json();

            if (data.success) {
                setCategories(data.categories || []);
                // Set Hero: Top video from "For You" (first row)
                if (data.categories?.length > 0 && data.categories[0].videos?.length > 0) {
                    setHeroVideo(data.categories[0].videos[0]);
                }
            } else {
                setError(getUserFriendlyMessage(data, 'We couldn\'t load recommendations right now. Please try again shortly.'));
            }
        } catch (err) {
            console.error(err);
            setError(getUserFriendlyMessage(err, 'We couldn\'t load recommendations right now. Please try again shortly.'));
        } finally {
            setLoading(false);
        }
    }

    fetchDiscoverFeed();
  }, []);

  if (loading) {
      return (
          <div className="min-h-dvh flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
      );
  }

  if (error) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center space-y-4">
             <p className="text-destructive font-medium">{error}</p>
             <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      );
  }

  if (categories.length === 0) {
      return (
          <div className="min-h-dvh pt-20 px-4 text-center">
              <h2 className="text-xl font-bold">No recommendations yet.</h2>
              <p className="text-muted-foreground">We&apos;re generating your personalized feed. Check back in a few minutes!</p>
          </div>
      );
  }

  return (
    <div className="min-h-dvh pb-20 fade-in">
      
      {/* Navbar */}
      <DiscoverNavbar subtitle="Explore new topics and expand your horizons." />

      {/* Hero Section */}
      {heroVideo && (
        <section className="relative aspect-[4/5] sm:aspect-auto sm:h-[50vh] sm:min-h-[400px] w-full mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl overflow-hidden group mx-auto max-w-[calc(100%-1rem)] sm:max-w-[98%] mt-4">
            {/* Hero Background — thumbnail reads at full opacity on mobile with
                a bottom-anchored scrim; side gradient on sm+ keeps the legacy
                left-column layout for wider viewports. */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/20 to-transparent sm:bg-linear-to-r sm:from-background sm:via-background/80 sm:to-transparent" />
            <div className="absolute inset-0">
                {heroVideo.thumbnail && (
                    <Image
                        src={heroVideo.thumbnail}
                        alt={heroVideo.title}
                        fill
                        className="object-cover opacity-100 sm:opacity-50"
                        priority
                    />
                )}
            </div>

            {/* More Info — mobile-only compact corner icon. On desktop the
                inline "More Info" button in the CTA row below takes its place. */}
            <button
                type="button"
                onClick={() => setSelectedVideo(heroVideo)}
                aria-label="More info"
                className="sm:hidden absolute top-3 right-3 z-30 inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white hover:bg-black/60 transition-colors cursor-pointer"
            >
                <Info className="w-5 h-5" />
            </button>

            {/* Hero Content — bottom-left anchored on mobile (over the scrim);
                centered left-column on sm+. */}
            <div className="relative z-20 h-full flex flex-col justify-end sm:justify-center px-5 sm:px-8 pb-5 sm:pb-0 max-w-2xl space-y-3 sm:space-y-6">
                <span className="inline-block px-2.5 py-1 bg-accent text-white sm:bg-accent/20 sm:text-accent rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest w-fit border border-accent sm:border-accent/20 shadow-md sm:shadow-none">
                    Top Pick For You
                </span>

                <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-white sm:text-foreground leading-tight drop-shadow-sm shadow-black line-clamp-3">
                    {heroVideo.title}
                </h1>

                <p className="hidden sm:block text-lg text-muted-foreground line-clamp-3 max-w-xl">
                    {heroVideo.description || `Recommended because you're interested in ${heroVideo.tags?.[0] || 'this topic'}.`}
                </p>

                <div className="flex flex-row flex-wrap gap-2 sm:gap-4 pt-1 sm:pt-4">
                    <Button
                        variant="primary"
                        size="sm"
                        className="rounded-xl font-bold shadow-xl hover:shadow-accent/40 transition-all min-h-11 sm:min-h-0 sm:text-lg sm:px-8 sm:py-4"
                        onClick={() => router.push(`/generations/${heroVideo.videoId || heroVideo._id}`)}
                    >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current mr-1.5 sm:mr-2" />
                        Watch Now
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="hidden sm:inline-flex rounded-xl font-semibold backdrop-blur-md sm:text-lg sm:px-8 sm:py-4"
                        onClick={() => setSelectedVideo(heroVideo)}
                    >
                        <Info className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                        More Info
                    </Button>
                </div>
            </div>
        </section>
      )}

      {/* Categories Grid */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {categories.map((cat) => (
            cat.videos.length > 0 && (
                <CategoryRow 
                    key={cat.name}
                    title={cat.name}
                    categoryId={cat.name} // Use name as ID for now
                    items={cat.videos.map(v => ({
                        _id: v._id,
                        videoId: v.videoId,
                        title: v.title,
                        thumbnail: v.thumbnail || '',
                        channelName: v.channelName || 'Clarity',
                        duration: v.duration || 0,
                        createdAt: new Date().toISOString(),
                        authorUsername: v.authorUsername
                    }))} 
                />
            )
        ))}
      </div>

      {/* More Info Modal */}
      {selectedVideo && (
          <VideoDetailsModal 
              isOpen={!!selectedVideo}
              onClose={() => setSelectedVideo(null)}
              video={selectedVideo}
              onPlay={() => router.push(`/generations/${selectedVideo.videoId || selectedVideo._id}`)}
          />
      )}
    </div>
  );
}
