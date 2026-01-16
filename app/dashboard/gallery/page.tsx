'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import SearchBar from '@/components/SearchBar';
import FilterDropdown from '@/components/FilterDropdown';
import GenerateModal from '@/components/GenerateModal';
import EmptyState from '@/components/EmptyState';
import VideoCard from '@/components/VideoCard';
import VideoListItem from '@/components/VideoListItem';
import Dialog from '@/components/Dialog';
import { Library, Layers, HelpCircle, Clock, LayoutGrid, List } from 'lucide-react';

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
  progress?: number;
  flashcardCount?: number;
  quizCount?: number;
  visibility?: 'private' | 'public';
}

export default function GalleryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [errorDialog, setErrorDialog] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    videoId: string;
    newVisibility: 'private' | 'public';
  }>({
    show: false,
    videoId: '',
    newVisibility: 'private',
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    show: boolean;
    videoId: string;
    videoTitle: string;
  }>({
    show: false,
    videoId: '',
    videoTitle: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Load view mode preference from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('library-view-mode') as 'grid' | 'list' | null;
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode preference to localStorage
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('library-view-mode', mode);
  };

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
      const clientNow = new Date();
      const timezoneOffsetMinutes = clientNow.getTimezoneOffset();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log('🎬 [FRONTEND] Sending POST request to /api/videos/process...');
      const response = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: url,
          clientTimestamp: clientNow.toISOString(),
          timezoneOffsetMinutes,
          timeZone,
        }),
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

  const handleVisibilityChange = async (videoId: string, newVisibility: 'private' | 'public') => {
      // Open confirmation dialog first
      setConfirmDialog({
        show: true,
        videoId,
        newVisibility,
      });
  };

  const confirmVisibilityChange = async () => {
      const { videoId, newVisibility } = confirmDialog;
      setConfirmDialog({ ...confirmDialog, show: false });

      // Optimistic update
      setVideos(videos.map(v => v.id === videoId ? { ...v, visibility: newVisibility } : v));

      try {
        const response = await fetch(`/api/videos/${videoId}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility: newVisibility }),
        });

        if (!response.ok) {
          throw new Error('Failed to update visibility');
        }
      } catch (error) {
        console.error('Error updating visibility:', error);
        // Revert on error
        setVideos(videos.map(v => v.id === videoId ? { ...v, visibility: v.visibility === 'public' ? 'private' : 'public' } : v));
        setErrorDialog({ show: true, message: 'Failed to update visibility' });
      }
  };

  const handleDelete = (videoId: string, videoTitle: string) => {
    setDeleteDialog({
      show: true,
      videoId,
      videoTitle,
    });
  };

  const confirmDeleteVideo = async () => {
    const { videoId } = deleteDialog;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete video');
      }

      // Remove from local state
      setVideos(videos.filter(v => v.id !== videoId));
      setDeleteDialog({ show: false, videoId: '', videoTitle: '' });
    } catch (error) {
      console.error('Error deleting video:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete video';
      setErrorDialog({ show: true, message });
    } finally {
      setIsDeleting(false);
    }
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
      // Use progress or transcriptMinutes for sorting
      return [...result].sort((a, b) => (b.progress || 0) - (a.progress || 0));
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
        <div className="flex items-center gap-3">
          <div className="sm:w-48">
            <FilterDropdown
              options={filterOptions}
              defaultValue="all"
              onFilterChange={handleFilterChange}
            />
          </div>
          {/* View Toggle */}
          <div className="flex items-center bg-card-bg border border-border rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-2 rounded transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-accent text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-2 rounded transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-accent text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Library Stats Summary */}
      {!loading && videos.length > 0 && (
        <div className="bg-card-bg border border-border rounded-xl px-6 py-4 mb-6">
          <div className="flex items-center justify-evenly text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <Library className="w-4 h-4 text-accent" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">{videos.length}</span>
                <span className="text-muted-foreground ml-1">videos</span>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-accent" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">{videos.reduce((acc, v) => acc + (v.flashcardCount || 0), 0)}</span>
                <span className="text-muted-foreground ml-1">flashcards</span>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-accent" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">{videos.reduce((acc, v) => acc + (v.quizCount || 0), 0)}</span>
                <span className="text-muted-foreground ml-1">quizzes</span>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-accent" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">{Math.round(videos.reduce((acc, v) => acc + (v.duration || 0), 0) / 60)}</span>
                <span className="text-muted-foreground ml-1">min of content</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-card-bg rounded-xl border border-border overflow-hidden">
              {/* Thumbnail */}
              <div className="aspect-video bg-secondary/20 animate-pulse"></div>

              {/* Content */}
              <div className="p-4">
                <div className="h-5 bg-secondary/20 rounded mb-2 animate-pulse"></div>
                <div className="h-4 bg-secondary/20 rounded mb-3 animate-pulse w-3/4"></div>

                <div className="flex items-center justify-between text-sm">
                  <div className="h-3 bg-secondary/20 rounded animate-pulse w-16"></div>
                  <div className="h-3 bg-secondary/20 rounded animate-pulse w-12"></div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="h-6 bg-accent/20 rounded animate-pulse w-16"></div>
                  <div className="w-8 h-8 bg-secondary/20 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
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

      {/* Videos Display */}
      {!loading && filteredVideos.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  channelName={video.channelName}
                  thumbnailUrl={video.thumbnailUrl}
                  duration={`${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60).toString().padStart(2, '0')}`}
                  transcriptMinutes={video.transcriptMinutes}
                  createdAt={video.createdAt}
                  progress={video.progress}
                  flashcardCount={video.flashcardCount}
                  quizCount={video.quizCount}
                  visibility={video.visibility}
                  onVisibilityChange={(newVisibility) => handleVisibilityChange(video.id, newVisibility)}
                  onDelete={() => handleDelete(video.id, video.title)}
                  onClick={handleVideoClick}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVideos.map((video) => (
                <VideoListItem
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  channelName={video.channelName}
                  thumbnailUrl={video.thumbnailUrl}
                  duration={`${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60).toString().padStart(2, '0')}`}
                  transcriptMinutes={video.transcriptMinutes}
                  createdAt={video.createdAt}
                  progress={video.progress}
                  flashcardCount={video.flashcardCount}
                  quizCount={video.quizCount}
                  visibility={video.visibility}
                  onVisibilityChange={(newVisibility) => handleVisibilityChange(video.id, newVisibility)}
                  onDelete={() => handleDelete(video.id, video.title)}
                  onClick={handleVideoClick}
                />
              ))}
            </div>
          )}
        </>
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

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={confirmDialog.show}
        onClose={() => setConfirmDialog({ ...confirmDialog, show: false })}
        onConfirm={confirmVisibilityChange}
        type="confirm"
        variant="warning"
        title={`Make Video ${confirmDialog.newVisibility === 'public' ? 'Public' : 'Private'}?`}
        message={
          confirmDialog.newVisibility === 'public'
            ? "Making this video public will allow anyone in the community to discover and learn from it. Are you sure you want to share it?"
            : "Making this video private will remove it from the Discover feed. Only you will be able to see it."
        }
        confirmText={confirmDialog.newVisibility === 'public' ? 'Make Public' : 'Make Private'}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteDialog.show}
        onClose={() => setDeleteDialog({ show: false, videoId: '', videoTitle: '' })}
        onConfirm={confirmDeleteVideo}
        type="confirm"
        variant="error"
        title="Delete Video?"
        message={`This will permanently delete "${deleteDialog.videoTitle}" and all associated data including flashcards, quizzes, notes, and progress. This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
      />
    </div>
  );
}
