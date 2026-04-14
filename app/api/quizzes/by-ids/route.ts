import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Quiz } from '@/lib/models';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const ids = request.nextUrl.searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    await dbConnect();

    const idList = ids.split(',').filter(Boolean);
    const quizzes = await Quiz.find({
      _id: { $in: idList },
      userId: decoded.userId,
    }).select('questionText options correctAnswerIndex explanation difficulty').lean();

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Error fetching quizzes by IDs:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}
