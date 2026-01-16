'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import VideoCard from './VideoCard';
import { motion } from 'framer-motion';

interface VideoItem {
  _id: string; 
  videoId?: string; // YouTube ID
  title: string;
  channelName?: string;
  thumbnail?: string;
  duration?: number;
  createdAt: string | Date;
  flashcardCount?: number;
  quizCount?: number;
  authorUsername?: string;
}

interface CategoryRowProps {
  title: string;
  items: any[];
  categoryId: string;
}

export default function CategoryRow({ title, items, categoryId }: CategoryRowProps) {
  const router = useRouter(); // Initialize router
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (rowRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  return (
    <div className="relative group/row py-4 mb-2">
      {/* Header */}
      <h2 className="text-xl font-bold text-foreground mb-4 px-4 sm:px-8 flex items-center gap-2 group-hover/row:text-accent transition-colors duration-300">
        {title}
        <ChevronRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all duration-300 text-accent" />
      </h2>

      <div className="relative group/slider">
          {/* Left Arrow */}
          <div className={`absolute left-0 top-0 bottom-0 w-12 bg-linear-to-r from-background to-transparent z-10 flex items-center justify-start pl-2 transition-opacity duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             <button 
                onClick={() => scroll('left')}
                className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
             >
                <ChevronLeft className="w-5 h-5" />
             </button>
          </div>

          {/* Right Arrow */}
          <div className={`absolute right-0 top-0 bottom-0 w-12 bg-linear-to-l from-background to-transparent z-10 flex items-center justify-end pr-2 transition-opacity duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <button 
                onClick={() => scroll('right')}
                className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
                aria-label="Scroll right"
             >
                <ChevronRight className="w-5 h-5" />
             </button>
          </div>
          
          {/* Scroll Container */}
          <div 
            ref={rowRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto no-scrollbar px-4 sm:px-8 pb-4"
          >
             {items.map((video, idx) => (
                 <div key={`${video._id}-${idx}`} className="flex-shrink-0 w-[280px] sm:w-[320px]">
                    <VideoCard
                        id={video._id}
                        title={video.title}
                        channelName={video.channelName || 'Unknown Channel'}
                        thumbnailUrl={video.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'}
                        duration={video.duration ? `${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60).toString().padStart(2, '0')}` : '10:00'}
                        createdAt={video.createdAt}
                        flashcardCount={video.flashcardCount || 0}
                        quizCount={video.quizCount || 0}
                        authorUsername={video.authorUsername}
                        onClick={() => {
                            // Prefer YouTube ID for navigation, fallback to Mongo ID
                            const targetId = video.videoId || video._id;
                            console.log(`Navigating to video ${targetId}`);
                            router.push(`/generations/${targetId}`);
                        }}
                        className="w-full"
                        variant="standard" 
                    />
                 </div>
             ))}
             {/* Spacer */}
             <div className="w-4 sm:w-8 flex-shrink-0" />
          </div>
      </div>
    </div>
  );
}
