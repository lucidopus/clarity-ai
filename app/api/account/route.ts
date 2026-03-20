import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import Progress from '@/lib/models/Progress';
import ActivityLog from '@/lib/models/ActivityLog';
import MindMap from '@/lib/models/MindMap';
import Note from '@/lib/models/Note';
import Solution from '@/lib/models/Solution';
import Source from '@/lib/models/Source';
import { deleteSupabaseFiles } from '@/lib/supabase';

/**
 * DELETE /api/account
 *
 * Permanently deletes a user account and all associated data.
 * This includes:
 * - User document
 * - Videos
 * - Learning Materials
 * - Flashcards
 * - Quizzes
 * - Progress records
 * - Activity logs
 * - Mind maps
 * - Notes
 * - Solutions
 *
 * Requires valid JWT token.
 */
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Clean up uploaded files from Supabase Storage
    const sources = await Source.find({ userId, fileUrl: { $exists: true, $ne: null } }, { fileUrl: 1 }).lean();
    const fileUrls = sources.map((s) => s.fileUrl).filter((url): url is string => !!url);
    if (fileUrls.length > 0) {
      await deleteSupabaseFiles(fileUrls);
    }

    // Delete all user-related data in parallel for better performance
    await Promise.all([
      Video.deleteMany({ userId }),
      Source.deleteMany({ userId }),
      LearningMaterial.deleteMany({ userId }),
      Flashcard.deleteMany({ userId }),
      Quiz.deleteMany({ userId }),
      Progress.deleteMany({ userId }),
      ActivityLog.deleteMany({ userId }),
      MindMap.deleteMany({ userId }),
      Note.deleteMany({ userId }),
      Solution.deleteMany({ userId }),
    ]);

    // Finally, delete the user document
    await User.findByIdAndDelete(userId);

    // Clear the JWT cookie
    const response = NextResponse.json({
      success: true,
      message: 'Account and all associated data deleted successfully',
    });

    response.cookies.set('jwt', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Immediately expire the cookie
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error while deleting account' },
      { status: 500 }
    );
  }
}
