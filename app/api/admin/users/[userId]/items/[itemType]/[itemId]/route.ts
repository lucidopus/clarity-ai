import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import MindMap from '@/lib/models/MindMap';
import Note from '@/lib/models/Note';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; itemType: string; itemId: string }> }
) {
  try {
    // Verify admin authentication
    const isAdmin = await verifyAdminToken(request);

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { userId, itemType, itemId } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid user ID',
        },
        { status: 400 }
      );
    }

    await dbConnect();

    let deletedItem = null;

    // Delete based on item type
    switch (itemType) {
      case 'flashcard':
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid flashcard ID',
            },
            { status: 400 }
          );
        }
        deletedItem = await Flashcard.findOneAndDelete({ _id: itemId, userId });
        break;

      case 'quiz':
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid quiz ID',
            },
            { status: 400 }
          );
        }
        deletedItem = await Quiz.findOneAndDelete({ _id: itemId, userId });
        break;

      case 'video':
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid video ID',
            },
            { status: 400 }
          );
        }
        // Get the video first to get the videoId
        const video = await Video.findOne({ _id: itemId, userId });
        if (video) {
          // Delete all related materials for this video
          await Promise.all([
            Flashcard.deleteMany({ userId, videoId: video.videoId }),
            Quiz.deleteMany({ userId, videoId: video.videoId }),
            LearningMaterial.deleteMany({ userId, videoId: video.videoId }),
            MindMap.deleteMany({ userId, videoId: video.videoId }),
            Note.deleteMany({ userId, videoId: video.videoId }),
          ]);
          deletedItem = await Video.findByIdAndDelete(itemId);
        }
        break;

      case 'learning-material':
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid learning material ID',
            },
            { status: 400 }
          );
        }
        deletedItem = await LearningMaterial.findOneAndDelete({ _id: itemId, userId });
        break;

      case 'mindmap':
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid mind map ID',
            },
            { status: 400 }
          );
        }
        deletedItem = await MindMap.findOneAndDelete({ _id: itemId, userId });
        break;

      case 'note':
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid note ID',
            },
            { status: 400 }
          );
        }
        deletedItem = await Note.findOneAndDelete({ _id: itemId, userId });
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            message: `Invalid item type: ${itemType}`,
          },
          { status: 400 }
        );
    }

    if (!deletedItem) {
      return NextResponse.json(
        {
          success: false,
          message: 'Item not found or does not belong to this user',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${itemType} deleted successfully`,
    });
  } catch (error) {
    console.error('Admin item deletion error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
      },
      { status: 500 }
    );
  }
}
