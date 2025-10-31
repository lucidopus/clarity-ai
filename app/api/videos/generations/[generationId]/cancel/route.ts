import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Generation from '@/lib/models/Generation';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ generationId: string }> }
) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // Await params in Next.js 16
    const { generationId } = await params;

    if (!generationId) {
      return NextResponse.json(
        { error: 'Generation ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find and update the generation to canceled status
    const generation = await Generation.findOneAndUpdate(
      {
        _id: generationId,
        userId: decoded.userId,
        status: { $in: ['queued', 'processing'] } // Only allow canceling active generations
      },
      {
        status: 'canceled',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found or cannot be canceled' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Generation canceled successfully',
      generation: {
        id: generation._id.toString(),
        status: generation.status,
        updatedAt: generation.updatedAt
      }
    });

  } catch (error) {
    console.error('Error canceling generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}