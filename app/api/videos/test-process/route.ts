import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import { processVideoWithScenario } from '@/lib/test-pipeline';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const body = await request.json() as { youtubeUrl?: unknown; scenario?: unknown };
    const youtubeUrl = typeof body.youtubeUrl === 'string' ? body.youtubeUrl : '';
    const scenario = typeof body.scenario === 'string' ? body.scenario : 'success';

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
    if (!youtubeRegex.test(youtubeUrl.trim())) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user already has this video
    const existingVideo = await Video.findOne({
      userId: decoded.userId,
      youtubeUrl: youtubeUrl.trim()
    });

    if (existingVideo) {
      return NextResponse.json(
        { error: 'This video has already been processed' },
        { status: 409 }
      );
    }

    // Process video using test pipeline
    const testData = await processVideoWithScenario(youtubeUrl.trim(), scenario);

    // Create video document
    const video = new Video({
      userId: decoded.userId,
      youtubeUrl: youtubeUrl.trim(),
      videoId: testData.videoId,
      title: testData.title,
      channelName: testData.channelName,
      thumbnail: testData.thumbnailUrl,
      duration: testData.duration,
      transcript: testData.transcript.map(seg => ({
        text: seg.text,
        offset: seg.start,
        duration: seg.duration,
        lang: 'en'
      })),
      language: 'en',
      processingStatus: 'completed',
      processedAt: new Date()
    });

    const savedVideo = await video.save();

    // Create learning materials document
    const learningMaterial = new LearningMaterial({
      videoId: savedVideo._id,
      userId: decoded.userId,
      flashcards: testData.materials.flashcards,
      quizzes: testData.materials.quizzes,
      timestamps: testData.materials.timestamps,
      prerequisites: testData.materials.prerequisites,
      chatbotContext: testData.materials.chatbotContext
    });

    await learningMaterial.save();

    return NextResponse.json({
      success: true,
      message: 'Video processed successfully (test mode)',
      videoId: savedVideo._id.toString(),
      materials: testData.materials
    });

  } catch (error) {
    console.error('Test video processing error:', error);

    // Handle specific test scenarios
    if (error instanceof Error) {
      if (error.message.includes('No transcript available')) {
        return NextResponse.json(
          { error: 'No transcript available for this video' },
          { status: 400 }
        );
      }
      if (error.message.includes('Failed to generate learning materials')) {
        return NextResponse.json(
          { error: 'Failed to generate learning materials' },
          { status: 500 }
        );
      }
      if (error.message.includes('Network connection failed')) {
        return NextResponse.json(
          { error: 'Network connection failed' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
