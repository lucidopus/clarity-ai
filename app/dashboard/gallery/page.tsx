'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import SearchBar from '@/components/SearchBar';
import FilterDropdown from '@/components/FilterDropdown';
import Button from '@/components/Button';

const filterOptions = [
  { label: 'All Materials', value: 'all' },
  { label: 'Recent', value: 'recent' },
  { label: 'Most Studied', value: 'most-studied' },
  { label: 'By Subject', value: 'by-subject' },
];

export default function GalleryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    console.log('Searching for:', query);
  };

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    console.log('Filter changed to:', value);
  };

  return (
    <div>
      {/* Page Header */}
      <DashboardHeader
        title="Library"
        subtitle="Access all your learning materials and generated content"
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

      {/* Empty State */}
      <div className="bg-card-bg rounded-2xl p-12 border border-border text-center min-h-[400px] flex items-center justify-center">
        <div className="max-w-md">
          <div className="w-20 h-20 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-10 h-10 text-purple-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Your library is empty</h3>
          <p className="text-muted-foreground mb-6">
            Generate your first learning materials from a YouTube video. All your content will be saved here.
          </p>
          <Button href="/dashboard/generate" variant="primary">
            Generate Materials
          </Button>
        </div>
      </div>
    </div>
  );
}
