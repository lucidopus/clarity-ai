'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
    type: string;
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
    type: string;
    options?: string[];
    correctAnswerIndex?: number;
    correctAnswer?: string;
    explanation: string;
  }>;
}

export default function VideoMaterialsPage() {
  const params = useParams();
  const router = useRouter();
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
    return <div className="p-8">Loading materials...</div>;
  }

  if (error || !materials) {
    return <div className="p-8 text-red-500">Error: {error || 'Materials not found'}</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto font-mono text-sm">
      <h1 className="text-2xl font-bold mb-4">VIDEO MATERIALS - FROM MONGODB</h1>

      <div className="mb-6">
        <h2 className="font-bold text-lg mb-2">VIDEO INFO:</h2>
        <p>Title: {materials.video.title}</p>
        <p>Channel: {materials.video.channelName}</p>
        <p>Duration: {materials.video.duration}</p>
      </div>

      <div className="mb-6">
        <h2 className="font-bold text-lg mb-2">PREREQUISITES: ({materials.prerequisites.length})</h2>
        {materials.prerequisites.map((prereq, i) => (
          <div key={prereq.id} className="mb-2 pl-4">
            <p>{i + 1}. {prereq.title}</p>
            <p className="text-gray-600 pl-4">- {prereq.description}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="font-bold text-lg mb-2">FLASHCARDS: ({materials.flashcards.length})</h2>
        {materials.flashcards.map((card, i) => (
          <div key={card.id} className="mb-3 pl-4">
            <p className="font-semibold">{i + 1}. Q: {card.question}</p>
            <p className="pl-4">A: {card.answer}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="font-bold text-lg mb-2">QUIZZES: ({materials.quizzes.length})</h2>
        {materials.quizzes.map((quiz, i) => (
          <div key={quiz.id} className="mb-3 pl-4">
            <p className="font-semibold">{i + 1}. {quiz.questionText}</p>
            {quiz.options?.map((option, j) => (
              <p key={j} className="pl-4">
                {j === quiz.correctAnswerIndex ? '✓ ' : '  '}
                {String.fromCharCode(65 + j)}. {option}
              </p>
            ))}
            <p className="pl-4 text-gray-600 mt-1">Explanation: {quiz.explanation}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="font-bold text-lg mb-2">TRANSCRIPT: ({materials.transcript.length} segments)</h2>
        {materials.transcript.map((segment, i) => (
          <div key={i} className="mb-2 pl-4">
            <p>
              <span className="text-gray-600">[{Math.floor(segment.start / 60)}:{(segment.start % 60).toString().padStart(2, '0')}]</span> {segment.text}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/dashboard/gallery')}
        className="mt-8 px-4 py-2 bg-blue-500 text-white rounded"
      >
        ← Back to Gallery
      </button>
    </div>
  );
}