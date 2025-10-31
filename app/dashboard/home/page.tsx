'use client';

import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/DashboardHeader';
import GenerateModal from '@/components/GenerateModal';
import Button from '@/components/Button';
import { useState, useEffect } from 'react';
import EmptyState from '@/components/EmptyState';

export default function DashboardHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [greeting, setGreeting] = useState('Welcome');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  const handleGenerate = async (youtubeUrl: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate materials');
      }

      const data = await response.json();
      setShowGenerateModal(false);
      router.push(`/dashboard/generations/${data.videoId}`);
    } catch (error: any) {
      console.error('Generation error:', error);
      alert(error.message); // Simple alert for now
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      {/* Page Header */}
      <DashboardHeader
        title={`${greeting}, ${user.firstName}`}
        onGenerateClick={() => setShowGenerateModal(true)}
      />

      {/* Empty State */}
      <div className="bg-card-bg rounded-2xl border border-border min-h-[400px] flex items-center justify-center">
        <EmptyState
          icon={<BarChart3 className="w-12 h-12" />}
          title="No learning materials yet"
          description="Your stats, progress, and recent activity will appear here once you start generating materials."
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
