'use client';

import { useState, useEffect } from 'react';
import { Search, Play, Info } from 'lucide-react';
import CategoryRow from '@/components/CategoryRow';
import Button from '@/components/Button';

// --- Configuration: The 15 Selected Categories ---
const CATEGORIES = [
  { id: 'morning_kickstart', title: 'Morning Kickstart (15 min)', desc: 'Energize your brain.' },
  { id: 'commute_quickies', title: 'Commute Quickies', desc: 'Perfect for on-the-go.' },
  { id: 'lunch_break', title: 'Lunch Break Learning', desc: 'Fit it in your schedule.' },
  { id: 'evening_wind_down', title: 'Evening Wind-Down', desc: 'Relax and reflect.' },
  { id: 'weekend_deep_dive', title: 'Weekend Deep Dive', desc: 'Master complex topics.' },
  { id: 'midnight_nuggets', title: 'Midnight Nuggets', desc: 'Fun facts for night owls.' },
  { id: 'habit_builder', title: 'Habit Builder', desc: 'Keep your streak alive.' },
  { id: 'quick_wins', title: 'Quick Wins', desc: 'Beat procrastination.' },
  { id: 'essentials_only', title: 'Essentials Only', desc: 'High density summaries.' },
  { id: 'structured_paths', title: 'Structured Paths', desc: 'Follow the roadmap.' },
  { id: 'active_recall', title: 'Active Recall', desc: 'Test yourself.' },
  { id: 'gap_fillers', title: 'Gap-Filler Modules', desc: 'Strengthen weak spots.' },
  { id: 'calm_clear', title: 'Calm & Clear', desc: 'Low stress learning.' },
  { id: 'trending', title: 'Trending Now', desc: 'See what everyone is watching.' },
  { id: 'new_arrival', title: 'New Arrivals', desc: 'Fresh from the oven.' },
];

// Valid Unsplash Image IDs to prevent 404s
const PLACEHOLDER_IMAGES = [
  "1501504905252-473c47e087f8",
  "1454165804606-c3d57bc86b40",
  "1516321318423-f06f85e504b3",
  "1515378791036-0648a3ef77b2",
  "1522202176988-66273c2fd55f",
  "1434030216411-0b793f4b4173",
  "1526374965328-7f61d4dc18c5"
];

/**
 * Generates dummy videos for a category to populate the UI.
 */
const generateDummyVideos = (count: number, categoryId: string) => {
  return Array.from({ length: count }).map((_, i) => {
    const imageId = PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];
    return {
      _id: `${categoryId}-video-${i}`,
      title: `${categoryId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: Episode ${i + 1}`,
      channelName: 'Clarity Original',
      thumbnail: `https://images.unsplash.com/photo-${imageId}?w=800&auto=format&fit=crop&q=60`,
      duration: 300 + i * 60,
      createdAt: new Date().toISOString(),
      flashcardCount: Math.floor(Math.random() * 10),
      quizCount: Math.floor(Math.random() * 5),
    };
  });
};

// ...
import DiscoverNavbar from '@/components/DiscoverNavbar';

// ... (keep previous imports and constants)

export default function DiscoverPage() {
  const [heroVideo, setHeroVideo] = useState<any>(null);

  useEffect(() => {
    // Set a random hero video on mount
    setHeroVideo({
        title: "The Art of Learning: Mastering Micro-Habits",
        description: "Discover the neuroscience behind habit formation and how to build a learning routine that sticks. Featuring expert interviews and interactive quizzes.",
        tags: ["Neuroscience", "Productivity", "Mastery"]
    });
  }, []);

  return (
    <div className="min-h-screen pb-20">
      
      {/* Navbar */}
      <DiscoverNavbar subtitle="Explore new topics and expand your horizons." />

      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] w-full mb-8 rounded-3xl overflow-hidden group">
         {/* Hero Background (simulated) */}
         <div className="absolute inset-0 bg-linear-to-r from-background via-background/80 to-transparent z-10" />
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-50" />
         
         {/* Hero Content */}
         <div className="relative z-20 h-full flex flex-col justify-center px-8 max-w-2xl space-y-6">
             {/* Badge */}
             <span className="inline-block px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-bold uppercase tracking-wide w-fit border border-accent/20">
                 Featured This Week
             </span>
             
             {/* Title */}
             <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight drop-shadow-sm">
                 {heroVideo?.title || 'Loading...'}
             </h1>
             
             {/* Description */}
             <p className="text-lg text-muted-foreground line-clamp-3 md:line-clamp-none max-w-xl">
                 {heroVideo?.description}
             </p>
             
             {/* Buttons */}
             <div className="flex flex-wrap gap-4 pt-4">
                 <Button 
                    variant="primary" 
                    size="lg" 
                    className="rounded-xl font-bold text-lg shadow-xl shadow-accent/20 hover:shadow-accent/40 transition-all duration-300"
                 >
                     <Play className="w-5 h-5 fill-current mr-2" />
                     Start Learning
                 </Button>
                 <Button variant="secondary" className="px-8 py-3 rounded-xl flex items-center gap-2 font-semibold text-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-foreground shadow-lg">
                     <Info className="w-5 h-5" />
                     More Info
                 </Button>
             </div>
         </div>
      </section>

      {/* Categories Grid (Vertical Stack of Rows) */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {CATEGORIES.map((cat, index) => (
            <CategoryRow 
                key={cat.id}
                title={cat.title}
                categoryId={cat.id}
                items={generateDummyVideos(10, cat.id)} // 10 dummy videos per row
            />
        ))}
      </div>
    </div>
  );
}
