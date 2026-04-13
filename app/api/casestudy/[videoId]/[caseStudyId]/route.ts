import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { LearningMaterial, Solution, Video, User } from '@/lib/models';
import Note from '@/lib/models/Note';

/**
 * GET /api/casestudy/[videoId]/[caseStudyId]
 * Fetch case study data including problem, video info, notes, and existing solution
 * Supports public video access with read-only mode for non-owners
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string; caseStudyId: string }> }
) {
  try {
    // 1. Authenticate
    const decoded = getAuthUser(request);

    await dbConnect();

    const { videoId, caseStudyId } = await params;

    // 2. Fetch video first to check ownership and visibility
    const video = await Video.findOne({ videoId });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // 3. Authorization: Must be owner OR video is public
    const isOwner = video.userId.toString() === decoded.userId;
    const isPublic = video.visibility === 'public';

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        { error: 'Unauthorized access to private video' },
        { status: 403 }
      );
    }

    const isReadOnly = !isOwner;
    const ownerId = video.userId;

    // 4. Fetch learning material using OWNER's ID (not viewer's)
    const learningMaterial = await LearningMaterial.findOne({
      sourceId: videoId,
      userId: ownerId,
    });

    if (!learningMaterial) {
      return NextResponse.json(
        { error: 'Learning material not found' },
        { status: 404 }
      );
    }

    // 5. Find the specific problem
    const problem = learningMaterial.realWorldProblems?.find(
      (p: { id: string }) => p.id === caseStudyId
    );

    if (!problem) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    // 6. Fetch viewer's notes (notes are personal to each user)
    const notes = await Note.findOne({
      sourceId: videoId,
      userId: decoded.userId,
    });

    // 7. Fetch viewer's existing solution
    const existingSolution = await Solution.findOne({
      userId: decoded.userId,
      sourceId: videoId,
      problemId: caseStudyId,
    });

    // 8. Fetch author's solution if viewer is not the owner
    let authorSolution = null;
    let authorUsername = undefined;
    if (isReadOnly) {
      const authorSolutionDoc = await Solution.findOne({
        userId: ownerId,
        sourceId: videoId,
        problemId: caseStudyId,
      });
      authorSolution = authorSolutionDoc?.content || null;

      // Fetch author username
      const author = await User.findById(ownerId).select('username').lean();
      authorUsername = (author as { username?: string } | null)?.username || undefined;
    }

    // 9. Construct response
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
      // Public access fields
      isReadOnly,
      authorSolution,
      authorUsername,
    });
  } catch (error) {
    console.error('Error fetching case study data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
