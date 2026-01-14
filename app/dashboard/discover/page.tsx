'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Info, Loader2 } from 'lucide-react';
import CategoryRow from '@/components/CategoryRow';
import Button from '@/components/Button';
import DiscoverNavbar from '@/components/DiscoverNavbar';
import Image from 'next/image';
import VideoDetailsModal from '@/components/VideoDetailsModal';

interface Video {
    _id: string;
    videoId?: string;
    title: string;
    description?: string;
    summary?: string; // from API
    thumbnail?: string;
    duration?: number;
    channelName?: string;
    tags?: string[];
    materialsStatus?: 'complete' | 'incomplete' | 'generating';
    incompleteMaterials?: string[];
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
            const res = await fetch('/api/discover');
            const data = await res.json();

            if (data.success) {
                setCategories(data.categories || []);
                // Set Hero: Top video from "For You" (first row)
                if (data.categories?.length > 0 && data.categories[0].videos?.length > 0) {
                    setHeroVideo(data.categories[0].videos[0]);
                }
            } else {
                setError(data.message || 'Failed to load recommendations.');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred while fetching content.');
        } finally {
            setLoading(false);
        }
    }

    fetchDiscoverFeed();
  }, []);

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
      );
  }

  if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
             <p className="text-destructive font-medium">{error}</p>
             <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      );
  }

  if (categories.length === 0) {
      return (
          <div className="min-h-screen pt-20 px-4 text-center">
              <h2 className="text-xl font-bold">No recommendations yet.</h2>
              <p className="text-muted-foreground">We're generating your personalized feed. Check back in a few minutes!</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen pb-20 fade-in">
      
      {/* Navbar */}
      <DiscoverNavbar subtitle="Explore new topics and expand your horizons." />

      {/* Hero Section */}
      {heroVideo && (
        <section className="relative h-[50vh] min-h-[400px] w-full mb-8 rounded-3xl overflow-hidden group mx-auto max-w-[98%] mt-4">
            {/* Hero Background */}
            <div className="absolute inset-0 bg-linear-to-r from-background via-background/80 to-transparent z-10" />
            <div className="absolute inset-0">
                {heroVideo.thumbnail && (
                    <Image 
                        src={heroVideo.thumbnail} 
                        alt={heroVideo.title}
                        fill
                        className="object-cover opacity-50"
                        priority
                    />
                )}
            </div>
            
            {/* Hero Content */}
            <div className="relative z-20 h-full flex flex-col justify-center px-8 max-w-2xl space-y-6">
                <span className="inline-block px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-bold uppercase tracking-wide w-fit border border-accent/20">
                    Top Pick For You
                </span>
                
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight drop-shadow-sm shadow-black">
                    {heroVideo.title}
                </h1>
                
                <p className="text-lg text-muted-foreground line-clamp-3 max-w-xl">
                    {heroVideo.description || `Recommended because you're interested in ${heroVideo.tags?.[0] || 'this topic'}.`}
                </p>
                
                <div className="flex flex-wrap gap-4 pt-4">
                    <Button 
                        variant="primary" 
                        size="lg" 
                        className="rounded-xl font-bold shadow-xl hover:shadow-accent/40 transition-all"
                        onClick={() => router.push(`/generations/${heroVideo.videoId || heroVideo._id}`)}
                    >
                        <Play className="w-5 h-5 fill-current mr-2" />
                        Watch Now
                    </Button>
                    <Button 
                        variant="secondary" 
                        className="rounded-xl font-semibold backdrop-blur-md"
                        onClick={() => setSelectedVideo(heroVideo)}
                    >
                        <Info className="w-5 h-5 mr-2" />
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
                        videoId: v.videoId, // Pass YouTube ID
                        title: v.title,
                        thumbnail: v.thumbnail || '',
                        channelName: v.channelName || 'Clarity',
                        duration: v.duration || 0,
                        createdAt: new Date().toISOString() // Fallback if missing
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
