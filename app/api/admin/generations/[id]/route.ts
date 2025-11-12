import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LearningMaterial from '@/lib/models/LearningMaterial';
import MindMap from '@/lib/models/MindMap';
import Note from '@/lib/models/Note';
import Solution from '@/lib/models/Solution';
import Flashcard from '@/lib/models/Flashcard';
import Video from '@/lib/models/Video';
import { withAdminAuth } from '@/lib/admin-middleware';

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Type of generation: 'learning_material', 'mindmap', 'note', 'solution', 'flashcard', 'video'

    if (!type) {
      return NextResponse.json(
        { success: false, message: 'Generation type is required' },
        { status: 400 }
      );
    }

    let deleted = false;
    let deletedItem = null;

    switch (type) {
      case 'video':
        // Delete video and all its associated materials
        const video = await Video.findById(id);
        if (!video) {
          return NextResponse.json(
            { success: false, message: 'Video not found' },
            { status: 404 }
          );
        }

        const videoIdStr = video._id.toString();

        // Delete all associated materials
        await Promise.all([
          LearningMaterial.deleteMany({ videoId: videoIdStr }),
          MindMap.deleteMany({ videoId: videoIdStr }),
          Note.deleteMany({ videoId: videoIdStr }),
          Solution.deleteMany({ videoId: videoIdStr }),
          Flashcard.deleteMany({ videoId: videoIdStr }),
        ]);

        // Delete the video itself
        deletedItem = await Video.findByIdAndDelete(id);
        deleted = true;
        break;

      case 'learning_material':
        deletedItem = await LearningMaterial.findByIdAndDelete(id);
        deleted = !!deletedItem;
        break;

      case 'mindmap':
        deletedItem = await MindMap.findByIdAndDelete(id);
        deleted = !!deletedItem;
        break;

      case 'note':
        deletedItem = await Note.findByIdAndDelete(id);
        deleted = !!deletedItem;
        break;

      case 'solution':
        deletedItem = await Solution.findByIdAndDelete(id);
        deleted = !!deletedItem;
        break;

      case 'flashcard':
        deletedItem = await Flashcard.findByIdAndDelete(id);
        deleted = !!deletedItem;
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid generation type' },
          { status: 400 }
        );
    }

    if (!deleted || !deletedItem) {
      return NextResponse.json(
        { success: false, message: 'Generation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Generation deleted successfully',
      data: {
        id,
        type,
      },
    });
  } catch (error) {
    console.error('Admin Generation Delete Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, (req) => handleDELETE(req, context));
}
