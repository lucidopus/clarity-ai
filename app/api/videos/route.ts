import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import Source from '@/lib/models/Source';
import Progress from '@/lib/models/Progress';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import mongoose from 'mongoose';
import { internalServerError } from '@/lib/errors/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const userId = new mongoose.Types.ObjectId(decoded.userId);

    await dbConnect();

    // Get all completed videos for the user
    const videos = await Video.find({
      userId: decoded.userId
    }).sort({ createdAt: -1 });

    // Fetch all progress documents for this user
    const progressDocs = await Progress.find({ userId: decoded.userId });
    
    // Create a map of sourceId -> progress document
    const progressMap = new Map();
    progressDocs.forEach(doc => {
      progressMap.set(doc.sourceId, doc);
    });

    // Aggregate total flashcards per source for this user
    const flashcardCounts = await Flashcard.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: "$sourceId", count: { $sum: 1 } } }
    ]);

    const flashcardCountMap = new Map();
    flashcardCounts.forEach(item => {
      flashcardCountMap.set(item._id, item.count);
    });

    // Aggregate total quizzes per source for this user
    const quizCounts = await Quiz.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: "$sourceId", count: { $sum: 1 } } }
    ]);

    const quizCountMap = new Map();
    quizCounts.forEach(item => {
      quizCountMap.set(item._id, item.count);
    });

    // Collect all sourceIds across all videos to batch-query source types
    const allSourceIds = videos.flatMap(v => v.allSourceIds || [v.videoId]);
    const sourceDocs = await Source.find(
      { sourceId: { $in: allSourceIds } },
      { sourceId: 1, sourceType: 1 }
    ).lean();
    const sourceTypeMap = new Map<string, string>();
    sourceDocs.forEach(s => sourceTypeMap.set(s.sourceId, s.sourceType));

    return NextResponse.json({
      videos: videos.map(video => {
        const totalFlashcards = flashcardCountMap.get(video.videoId) || 0;
        const totalQuizzes = quizCountMap.get(video.videoId) || 0;
        const totalItems = totalFlashcards + totalQuizzes;

        const progressDoc = progressMap.get(video.videoId);
        const masteredFlashcards = progressDoc?.masteredFlashcardIds?.length || 0;
        const masteredQuizzes = progressDoc?.masteredQuizIds?.length || 0;
        const completedItems = masteredFlashcards + masteredQuizzes;

        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        return {
          id: video.videoId, // YouTube video ID for routing to /generations/${videoId}
          _id: video._id.toString(), // MongoDB ID (kept for backward compatibility if needed)
          title: video.title,
          channelName: video.channelName || 'YouTube',
          thumbnailUrl: video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
          duration: video.duration || 0,
          transcriptMinutes: Math.round((video.transcript?.reduce((total: number, seg: { duration: number }) => total + seg.duration, 0) || 0) / 60),
          createdAt: video.createdAt,
          progress,
          flashcardCount: totalFlashcards,
          quizCount: totalQuizzes,
          visibility: video.visibility || 'private',
          sourceTypes: (video.allSourceIds || [video.videoId])
            .map((sid: string) => sourceTypeMap.get(sid))
            .filter(Boolean)
        };
      })
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    return internalServerError();
  }
}