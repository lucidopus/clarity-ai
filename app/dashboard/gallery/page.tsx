'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import SearchBar from '@/components/SearchBar';
import FilterDropdown from '@/components/FilterDropdown';
import Button from '@/components/Button';
import GenerateModal from '@/components/GenerateModal';
import EmptyState from '@/components/EmptyState';
import { Library } from 'lucide-react';

const filterOptions = [
  { label: 'All Materials', value: 'all' },
  { label: 'Recent', value: 'recent' },
  { label: 'Most Studied', value: 'most-studied' },
  { label: 'By Subject', value: 'by-subject' },
];

export default function GalleryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
      // TODO: Implement actual generation logic in Phase 5
      console.log('Generating materials for URL:', url);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Close modal and show success
      setShowGenerateModal(false);
      // TODO: Redirect to generated materials or show success message
    } catch (error) {
      console.error('Generation failed:', error);
      // TODO: Show error message
    } finally {
      setIsGenerating(false);
    }
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

      <div className="bg-card-bg rounded-2xl border border-border min-h-[400px] flex items-center justify-center">
        <EmptyState
          icon={<Library className="w-12 h-12" />}
          title="Your Library is Empty"
          description="Generate your first learning materials from a YouTube video to get started."
          actionLabel="Generate Materials"
          onAction={() => setShowGenerateModal(true)}
        />
      </div>

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
