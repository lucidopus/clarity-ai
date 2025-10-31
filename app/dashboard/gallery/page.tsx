'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import SearchBar from '@/components/SearchBar';
import FilterDropdown from '@/components/FilterDropdown';
import Button from '@/components/Button';
import GenerateModal from '@/components/GenerateModal';
import EmptyState from '@/components/EmptyState';
import VideoCard from '@/components/VideoCard';
import { Library } from 'lucide-react';
import { useRouter } from 'next/navigation';

const filterOptions = [
  { label: 'All Materials', value: 'all' },
  { label: 'Recent', value: 'recent' },
  { label: 'Most Studied', value: 'most-studied' },
  { label: 'By Subject', value: 'by-subject' },
];

interface Video {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl?: string;
  duration: number;
  transcriptMinutes: number;
  createdAt: Date | string;
}

export default function GalleryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch videos on mount
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/videos');
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        const data = await response.json();
        setVideos(data.videos);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    console.log('Searching for:', query);
  };

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    console.log('Filter changed to:', value);
  };

  const handleGenerate = async (url: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate materials');
      }

      // Phase 5 not implemented: Just close modal and show info.
      setShowGenerateModal(false);
      alert('Video processing is not available yet. Phase 5 pipeline is being prepared.');
    } catch (error: any) {
      console.error('Generation failed:', error);
      alert(error.message); // Simple alert for now
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVideoClick = (videoId: string) => {
    // Open in new tab
    window.open(`/dashboard/generations/${videoId}`, '_blank');
  };

  return (
    <div>
      {/* Page Header */}
      <DashboardHeader
        title="Library"
        subtitle="Access all your learning materials and generated content"
        onGenerateClick={() => setShowGenerateModal(true)}
      />

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchBar
            placeholder="Search your learning materials..."
            onSearch={handleSearch}
          />
        </div>
        <div className="sm:w-48">
          <FilterDropdown
            options={filterOptions}
            defaultValue="all"
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your library...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && (
        <div className="bg-card-bg rounded-2xl border border-border min-h-[400px] flex items-center justify-center">
          <EmptyState
            icon={<Library className="w-12 h-12" />}
            title="Your Library is Empty"
            description="Generate your first learning materials from a YouTube video to get started."
            actionLabel="Generate Materials"
            onAction={() => setShowGenerateModal(true)}
          />
        </div>
      )}

      {/* Videos Grid */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              channelName={video.channelName}
              duration={`${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}`}
              transcriptMinutes={video.transcriptMinutes}
              createdAt={video.createdAt}
              onClick={handleVideoClick}
            />
          ))}
        </div>
      )}

      {/* Generate Modal */}
      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        isLoading={isGenerating}
      />
    </div>
  );
}
