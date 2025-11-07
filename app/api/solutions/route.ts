import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { Solution } from '@/lib/models';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

/**
 * POST /api/solutions
 * Save or update a user's solution to a real-world problem
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // 2. Parse request
    const { videoId, problemId, content } = await request.json();

    if (!videoId || !problemId) {
      return NextResponse.json(
        { error: 'videoId and problemId are required' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 3. Create or update solution
    const solution = await Solution.findOneAndUpdate(
      {
        userId: decoded.userId,
        videoId,
        problemId,
      },
      {
        userId: decoded.userId,
        videoId,
        problemId,
        content: content.trim(),
      },
      {
        upsert: true, // Create if doesn't exist
        new: true, // Return updated document
        runValidators: true,
      }
    );

    return NextResponse.json({
      success: true,
      solution: {
        id: solution._id,
        videoId: solution.videoId,
        problemId: solution.problemId,
        content: solution.content,
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error saving solution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/solutions?videoId=<videoId>&problemId=<problemId>
 * Retrieve a user's solution for a specific problem
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // 2. Parse query params
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const problemId = searchParams.get('problemId');

    if (!videoId || !problemId) {
      return NextResponse.json(
        { error: 'videoId and problemId query parameters are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 3. Retrieve solution
    const solution = await Solution.findOne({
      userId: decoded.userId,
      videoId,
      problemId,
    });

    if (!solution) {
      return NextResponse.json(
        { error: 'Solution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      solution: {
        id: solution._id,
        videoId: solution.videoId,
        problemId: solution.problemId,
        content: solution.content,
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error retrieving solution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
