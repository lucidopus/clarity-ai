import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { LearningMaterial, Solution, Video } from '@/lib/models';
import Note from '@/lib/models/Note';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

/**
 * GET /api/casestudy/[videoId]/[caseStudyId]
 * Fetch case study data including problem, video info, notes, and existing solution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string; caseStudyId: string }> }
) {
  try {
    // 1. Authenticate
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    await dbConnect();

    const { videoId, caseStudyId } = await params;

    // 2. Fetch learning material to get the problem
    const learningMaterial = await LearningMaterial.findOne({
      videoId,
      userId: decoded.userId,
    });

    if (!learningMaterial) {
      return NextResponse.json(
        { error: 'Learning material not found' },
        { status: 404 }
      );
    }

    // 3. Find the specific problem
    const problem = learningMaterial.realWorldProblems?.find(
      (p: { id: string }) => p.id === caseStudyId
    );

    if (!problem) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    // 4. Fetch video info
    const video = await Video.findOne({ videoId, userId: decoded.userId });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // 5. Fetch user's notes for this video
    const notes = await Note.findOne({
      videoId,
      userId: decoded.userId,
    });

    // 6. Fetch existing solution if available
    const existingSolution = await Solution.findOne({
      userId: decoded.userId,
      videoId,
      problemId: caseStudyId,
    });

    // 7. Construct response
    return NextResponse.json({
      problem: {
        id: problem.id,
        title: problem.title,
        scenario: problem.scenario,
        hints: problem.hints,
      },
      video: {
        id: video._id,
        videoId: video.videoId,
        title: video.title,
        channelName: video.channelName,
      },
      notes: {
        generalNote: notes?.generalNote || '',
        segmentNotes: notes?.segmentNotes || [],
      },
      existingSolution: existingSolution?.content || null,
    });
  } catch (error) {
    console.error('Error fetching case study data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
