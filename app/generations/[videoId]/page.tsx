'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface VideoMaterials {
  video: {
    id: string;
    title: string;
    channelName: string;
    thumbnailUrl?: string;
    duration?: string;
    createdAt: Date | string;
  };
  flashcards: Array<{
    id: string;
    question: string;
    answer: string;
    isMastered: boolean;
    isUserCreated: boolean;
  }>;
  quizzes: Array<{
    id: string;
    questionText: string;
    type: 'multiple-choice' | 'true-false' | 'fill-in-blank';
    options?: string[];
    correctAnswerIndex?: number;
    correctAnswer?: string;
    explanation: string;
  }>;
  transcript: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  prerequisites: Array<{
    id: string;
    title: string;
    description: string;
    required: boolean;
  }>;
  prerequisiteQuiz: Array<{
    id: string;
    questionText: string;
    type: 'multiple-choice' | 'true-false' | 'fill-in-blank';
    options?: string[];
    correctAnswerIndex?: number;
    correctAnswer?: string;
    explanation: string;
  }>;
}

export default function VideoMaterialsPage() {
  const params = useParams();
  const videoId = params.videoId as string;

  const [materials, setMaterials] = useState<VideoMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}/materials`);
        if (!response.ok) {
          throw new Error('Failed to fetch materials');
        }
        const data = await response.json();
        setMaterials(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchMaterials();
    }
  }, [videoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading materials...</p>
        </div>
      </div>
    );
  }

  if (error || !materials) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-500">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error || 'Materials not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Raw MongoDB Data</h1>
      </div>

      <div className="bg-card-bg border border-border rounded-xl p-6 overflow-auto">
        <pre className="text-xs text-foreground whitespace-pre-wrap break-words">
          {JSON.stringify(materials, null, 2)}
        </pre>
      </div>
    </div>
  );
}
