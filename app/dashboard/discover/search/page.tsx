'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Play, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import DiscoverNavbar from '@/components/DiscoverNavbar';

interface VideoResult {
  _id: string;
  videoId?: string;
  title: string;
  description?: string;
  summary?: string;
  thumbnail?: string;
  channelName?: string;
  category?: string;
  duration?: number;
  tags?: string[];
  score?: number; // Relevance score
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const router = useRouter();

  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
       setLoading(false);
       return;
    }

    async function fetchResults() {
      try {
        setLoading(true);
        setError(null);
        // Request Semantic Search
        const res = await fetch(`/api/search?q=${encodeURIComponent(query!)}&mode=semantic`);
        const data = await res.json();

        if (data.success) {
          setResults(data.results || []);
        } else {
          setError(data.message || 'Failed to search videos.');
        }
      } catch (err) {
        console.error(err);
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query]);

  if (!query) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
              <h2 className="text-xl font-bold mb-2">Search for anything</h2>
              <p className="text-muted-foreground">Type something in the global search bar to get started.</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen pb-20">
      <DiscoverNavbar 
        initialQuery={query || ''}
        showBackButton={true}
      />

      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {loading && Array.from({ length: 4 }).map((_, i) => (
             <div 
               key={i} 
               className="flex flex-col sm:flex-row gap-4 sm:gap-6 bg-card-bg border border-border p-4 rounded-xl animate-pulse"
             >
                 {/* Thumbnail Skeleton */}
                 <div className="w-full sm:w-[260px] aspect-video shrink-0 rounded-lg bg-secondary/10" />

                 {/* Content Skeleton */}
                 <div className="flex flex-col flex-1 py-1">
                     <div className="h-6 bg-secondary/10 rounded w-3/4 mb-3" />
                     <div className="h-4 bg-secondary/10 rounded w-1/2 mb-4" />
                     <div className="space-y-2">
                         <div className="h-3 bg-secondary/10 rounded w-full" />
                         <div className="h-3 bg-secondary/10 rounded w-5/6" />
                     </div>
                     <div className="mt-auto pt-4 flex gap-2">
                         <div className="h-5 w-16 bg-secondary/10 rounded-full" />
                         <div className="h-5 w-12 bg-secondary/10 rounded-full" />
                         <div className="h-5 w-20 bg-secondary/10 rounded-full" />
                     </div>
                 </div>
             </div>
          ))}

          {error && (
             <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3 text-destructive">
                 <AlertCircle className="w-5 h-5" />
                 <p>{error}</p>
             </div>
          )}

          {!loading && !error && results.length === 0 && (
              <div className="text-center py-20">
                  <p className="text-xl font-semibold mb-2">No relevant videos found.</p>
                  <p className="text-muted-foreground">Try searching for broader concepts like &quot;Python&quot; or &quot;History&quot;.</p>
              </div>
          )}

          {!loading && results.map((video) => (
              <div 
                key={video._id} 
                className="group flex flex-col sm:flex-row gap-4 sm:gap-6 bg-card-bg border border-border p-4 rounded-xl hover:border-accent/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => router.push(`/generations/${video.videoId || video._id}`)}
              >
                  {/* Thumbnail / Left */}
                  <div className="relative w-full sm:w-[260px] aspect-video shrink-0 rounded-lg overflow-hidden bg-secondary/10">
                      {video.thumbnail ? (
                          <Image
                              src={video.thumbnail}
                              alt={video.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                      ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                              <Play className="w-10 h-10 text-muted-foreground/30" />
                          </div>
                      )}
                      
                      {/* Duration Badge */}
                      {video.duration ? (
                           <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">
                               {Math.floor((video.duration || 0) / 60)}:{Math.round((video.duration || 0) % 60).toString().padStart(2, '0')}
                           </div>
                      ) : null}
                  </div>

                  {/* Content / Right */}
                  <div className="flex flex-col flex-1 min-w-0 py-1">
                      <div className="flex items-start justify-between gap-4">
                          <h3 className="text-lg font-bold text-foreground leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                              {video.title}
                          </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground font-medium">
                          {video.channelName && (
                              <span className="hover:text-foreground transition-colors">{video.channelName}</span>
                          )}
                          <span>•</span>
                          <span className="capitalize">{video.category || 'General'}</span>
                           {video.score && (
                              <>
                                <span>•</span>
                                <span className="text-accent/80 font-mono text-[10px]">
                                    Match: {(video.score * 100).toFixed(0)}%
                                </span>
                              </>
                          )}
                      </div>

                      <div className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          <ReactMarkdown
                              components={{
                                  p: ({ children }) => <span className="mr-1">{children}</span>,
                                  strong: ({ children }) => <span className="font-bold text-foreground">{children}</span>,
                                  h1: ({ children }) => <span className="font-bold text-foreground block">{children}</span>,
                                  h2: ({ children }) => <span className="font-bold text-foreground block">{children}</span>,
                                  h3: ({ children }) => <span className="font-semibold text-foreground block">{children}</span>,
                                  ul: ({ children }) => <span className="block">{children}</span>,
                                  li: ({ children }) => <span className="mr-2 inline-block">• {children}</span>,
                              }}
                          >
                            {video.summary || video.description || "No description available."}
                          </ReactMarkdown>
                      </div>

                      <div className="mt-auto pt-4 flex flex-wrap gap-2">
                          {video.tags?.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] rounded-full font-medium border border-cyan-500/20">
                                  #{tag}
                              </span>
                          ))}
                      </div>
                  </div>
              </div>
          ))}

      </div>
    </div>
  );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>}>
            <SearchPageContent />
        </Suspense>
    );
}
