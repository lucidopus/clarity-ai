import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import { logValidationOverride } from '@/lib/content-validator';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

/**
 * POST /api/videos/[videoId]/validation-action
 * 
 * Handle user actions for validation-rejected videos:
 * - "reject": Mark as failed (don't generate)
 * - "override": Mark as completed_with_warning (generate anyway via retry task)
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ videoId: string }> }
) {
  const params = await props.params;
  console.log('🎯 [VALIDATION ACTION] Starting validation action handler...');
  
  try {
    // 1. Verify authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    console.log(`✅ [VALIDATION ACTION] Authentication successful for user: ${decoded.userId}`);

    // 2. Parse request body
    const { action } = await request.json();
    console.log(`🎯 [VALIDATION ACTION] Action: ${action}`);

    if (!action || !['reject', 'override'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "reject" or "override"' },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await dbConnect();

    // 4. Find video
    const { videoId } = params;
    const video = await Video.findById(videoId);

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // 5. Verify ownership
    if (video.userId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 6. Verify video is in validation_rejected status
    if (video.processingStatus !== 'validation_rejected') {
      return NextResponse.json(
        { error: 'Video is not in validation_rejected status' },
        { status: 400 }
      );
    }

    // 7. Handle action
    if (action === 'reject') {
      // User chose "Don't Generate" - delete the video entirely
      await Video.findByIdAndDelete(videoId);
      
      // Also delete related documents if any exist (though likely none yet for this flow)
      // This is a robust cleanup
      // const Progres = ... (if needed, but usually cascading not set up in mongo)
      // For now just deleting the video doc is sufficient as materials wouldn't exist yet

      console.log(`❌ [VALIDATION ACTION] Video ${video.videoId} deleted (user rejected)`);

      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: 'Video deleted from library',
      });

    } else {
      // User chose "Generate Anyway" - mark as completed_with_warning for retry task
      await Video.findByIdAndUpdate(videoId, {
        processingStatus: 'completed_with_warning',
        materialsStatus: 'incomplete',
        incompleteMaterials: ['flashcards', 'quizzes', 'prerequisites', 'mindmap', 'casestudies'],
        errorType: 'VALIDATION_OVERRIDE',
        errorMessage: 'User overrode validation rejection - generating materials',
      });

      // Log override to SystemLog for analytics
      await logValidationOverride(video.videoId, 'User manually overrode validation rejection');

      console.log(`✅ [VALIDATION ACTION] Video ${video.videoId} marked for retry (user override)`);

      return NextResponse.json({
        success: true,
        action: 'override',
        message: 'Materials will be generated soon. Check back in a few minutes.',
        videoId: video.videoId,
      });
    }

  } catch (error) {
    console.error('❌ [VALIDATION ACTION] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
