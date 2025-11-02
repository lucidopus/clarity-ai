'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import SearchBar from '@/components/SearchBar';
import FilterDropdown from '@/components/FilterDropdown';
import GenerateModal from '@/components/GenerateModal';
import EmptyState from '@/components/EmptyState';
import VideoCard from '@/components/VideoCard';
import Dialog from '@/components/Dialog';
import { Library } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorDialog, setErrorDialog] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });

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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFilterChange = useCallback((value: string) => {
    setFilterValue(value);
  }, []);

  const handleGenerate = async (url: string) => {
    console.log('🎬 [FRONTEND] Starting video generation...');
    console.log(`🎬 [FRONTEND] YouTube URL: ${url}`);

    setIsGenerating(true);
    try {
      console.log('🎬 [FRONTEND] Sending POST request to /api/videos/process...');
      const response = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: url }),
      });

      console.log(`🎬 [FRONTEND] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [FRONTEND] API error response:', errorData);
        throw new Error(errorData.error || 'Failed to generate materials');
      }

      const data = await response.json();
      console.log('✅ [FRONTEND] Generation successful:', data);

      // Close modal
      setShowGenerateModal(false);

       // Open generation page in new tab
       if (data.videoId) {
         console.log(`🎬 [FRONTEND] Opening /generations/${data.videoId} in new tab`);
         window.open(`/generations/${data.videoId}`, '_blank');
       } else {
         console.error('❌ [FRONTEND] No videoId in response');
       }
    } catch (error: unknown) {
      console.error('❌ [FRONTEND] Generation failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate materials';
      setErrorDialog({ show: true, message });
    } finally {
      setIsGenerating(false);
      console.log('🎬 [FRONTEND] Generation flow completed');
    }
  };

  const handleVideoClick = (videoId: string) => {
    // Open in new tab
    window.open(`/generations/${videoId}`, '_blank');
  };

  const filteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = (video: Video) =>
      video.title.toLowerCase().includes(query) ||
      video.channelName.toLowerCase().includes(query);

    const sorted = [...videos].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    const result = query ? sorted.filter(matchesSearch) : sorted;

    if (filterValue === 'recent') {
      return result;
    }

    if (filterValue === 'most-studied') {
      return [...result].sort((a, b) => b.transcriptMinutes - a.transcriptMinutes);
    }

    return result;
  }, [videos, searchQuery, filterValue]);

  return (
    <div>
      {/* Page Header */}
      <DashboardHeader
        title="Library"
        subtitle="Access all your learning materials and generated content"
        onGenerateClick={() => setShowGenerateModal(!showGenerateModal)}
        isGenerateModalOpen={showGenerateModal}
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
      {!loading && filteredVideos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              channelName={video.channelName}
              duration={`${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60).toString().padStart(2, '0')}`}
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

      {/* Error Dialog */}
      <Dialog
        isOpen={errorDialog.show}
        onClose={() => setErrorDialog({ show: false, message: '' })}
        type="alert"
        variant="error"
        title="Generation Failed"
        message={errorDialog.message}
        confirmText="OK"
      />
    </div>
  );
}
