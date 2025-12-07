import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import Progress from '@/lib/models/Progress';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import mongoose from 'mongoose';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const userId = new mongoose.Types.ObjectId(decoded.userId);

    await dbConnect();

    // Get all completed videos for the user
    const videos = await Video.find({
      userId: decoded.userId
    }).sort({ createdAt: -1 });

    // Fetch all progress documents for this user
    const progressDocs = await Progress.find({ userId: decoded.userId });
    
    // Create a map of videoId -> progress document
    const progressMap = new Map();
    progressDocs.forEach(doc => {
      progressMap.set(doc.videoId, doc);
    });

    // Aggregate total flashcards per video for this user
    const flashcardCounts = await Flashcard.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: "$videoId", count: { $sum: 1 } } }
    ]);
    
    const flashcardCountMap = new Map();
    flashcardCounts.forEach(item => {
      flashcardCountMap.set(item._id, item.count);
    });

    // Aggregate total quizzes per video for this user
    const quizCounts = await Quiz.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: "$videoId", count: { $sum: 1 } } }
    ]);

    const quizCountMap = new Map();
    quizCounts.forEach(item => {
      quizCountMap.set(item._id, item.count);
    });

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
          quizCount: totalQuizzes
        };
      })
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}