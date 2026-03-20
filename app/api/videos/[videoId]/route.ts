import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import Progress from '@/lib/models/Progress';
import Note from '@/lib/models/Note';
import MindMap from '@/lib/models/MindMap';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Source from '@/lib/models/Source';
import { deleteSupabaseFiles } from '@/lib/supabase';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const userId = decoded.userId;
    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Verify the user owns this video
    const video = await Video.findOne({ videoId, userId });
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Clean up uploaded files from Supabase Storage
    const sources = await Source.find({ userId, videoDocId: video._id, fileUrl: { $exists: true, $ne: null } }, { fileUrl: 1 }).lean();
    const fileUrls = sources.map((s) => s.fileUrl).filter((url): url is string => !!url);
    if (fileUrls.length > 0) {
      await deleteSupabaseFiles(fileUrls);
    }

    // Delete all related data across all collections
    const deleteOperations = await Promise.all([
      Video.deleteOne({ videoId, userId }),
      Source.deleteMany({ userId, videoDocId: video._id }),
      Flashcard.deleteMany({ sourceId: videoId, userId }),
      Quiz.deleteMany({ sourceId: videoId, userId }),
      Progress.deleteOne({ sourceId: videoId, userId }),
      Note.deleteOne({ sourceId: videoId, userId }),
      MindMap.deleteOne({ sourceId: videoId, userId }),
      LearningMaterial.deleteOne({ sourceId: videoId, userId }),
    ]);

    // Calculate total deleted items
    const totalDeleted = deleteOperations.reduce((sum, result) => {
      return sum + (result.deletedCount || 0);
    }, 0);

    return NextResponse.json({
      success: true,
      message: 'Video and all associated data deleted successfully',
      deletedItems: totalDeleted,
    });

  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
