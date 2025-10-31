'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Button from '@/components/Button';

export default function GeneratePage() {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 5: Will handle video processing here
    console.log('Processing URL:', url);
  };

  return (
    <div>
      {/* Page Header */}
      <DashboardHeader
        title="Generate"
        subtitle="Transform YouTube videos into interactive learning materials"
      />

      {/* Input Section */}
      <div className="bg-card-bg rounded-2xl p-8 border border-border">
        <form onSubmit={handleSubmit}>
          <label htmlFor="youtube-url" className="block text-sm font-medium text-foreground mb-3">
            YouTube Video URL
          </label>
          <div className="flex gap-3">
            <input
              id="youtube-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
              required
            />
            <Button type="submit" variant="primary" disabled={!url} className="px-8">
              Generate
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Paste any public YouTube video URL with available captions
          </p>
        </form>

        {/* Hint */}
        <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-sm text-foreground">
            💡 <span className="font-medium">Tip:</span> We'll automatically generate flashcards, quizzes, and interactive transcripts from your video.
          </p>
        </div>
      </div>
    </div>
  );
}
