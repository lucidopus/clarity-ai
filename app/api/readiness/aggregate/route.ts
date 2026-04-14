import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getAggregateReadiness } from '@/lib/services/readinessScore';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const [result, user] = await Promise.all([
      getAggregateReadiness(decoded.userId),
      User.findById(decoded.userId)
        .select('preferences.learning.learningGoalText preferences.learning.learningGoals preferences.learning.role')
        .lean() as Promise<{ preferences?: { learning?: { learningGoalText?: string; learningGoals?: string[]; role?: string } } } | null>,
    ]);

    const learning = user?.preferences?.learning;
    const userGoal = learning?.learningGoalText?.trim() || null;
    const userGoals = learning?.learningGoals ?? [];
    const userRole = learning?.role ?? null;

    return NextResponse.json({ ...result, userGoal, userGoals, userRole }, {
      headers: { 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (error) {
    console.error('Error fetching aggregate clarity score:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}
