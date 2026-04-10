import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getAggregateReadiness } from '@/lib/services/readinessScore';

interface DecodedToken {
  userId: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
