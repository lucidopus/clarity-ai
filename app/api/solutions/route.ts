import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Solution } from '@/lib/models';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

/**
 * POST /api/solutions
 * Save or update a user's solution to a real-world problem
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const decoded = getAuthUser(request);

    // 2. Parse request (accept both sourceId and videoId for backward compat)
    const body = await request.json();
    const sourceId = body.sourceId || body.videoId;
    const { problemId, content } = body;

    if (!sourceId || !problemId) {
      return NextResponse.json(
        { error: 'sourceId (or videoId) and problemId are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 3. Create or update solution
    const solution = await Solution.findOneAndUpdate(
      {
        userId: decoded.userId,
        sourceId,
        problemId,
      },
      {
        userId: decoded.userId,
        sourceId,
        problemId,
        content: typeof content === 'string' ? content.trim() : '',
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return NextResponse.json({
      success: true,
      solution: {
        id: solution._id,
        videoId: solution.sourceId,
        sourceId: solution.sourceId,
        problemId: solution.problemId,
        content: solution.content,
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error saving solution:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}

/**
 * GET /api/solutions?videoId=<id>&problemId=<problemId>
 * Retrieve a user's solution for a specific problem
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const decoded = getAuthUser(request);

    // 2. Parse query params (accept both sourceId and videoId)
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId') || searchParams.get('videoId');
    const problemId = searchParams.get('problemId');

    if (!sourceId || !problemId) {
      return NextResponse.json(
        { error: 'sourceId (or videoId) and problemId query parameters are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 3. Retrieve solution
    const solution = await Solution.findOne({
      userId: decoded.userId,
      sourceId,
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
        videoId: solution.sourceId,
        sourceId: solution.sourceId,
        problemId: solution.problemId,
        content: solution.content,
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error retrieving solution:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}
