import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Source from '@/lib/models/Source';
import { getReadinessScore } from '@/lib/services/readinessScore';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const { sourceId } = await params;

    await dbConnect();

    // Fetch source for exam date metadata (read-only — doesn't block score)
    const source = await Source.findOne({ sourceId, userId: decoded.userId })
      .select('examDate examName')
      .lean();

    const result = await getReadinessScore(decoded.userId, sourceId);

    // Compute days until exam if set
    let daysUntilExam: number | null = null;
    if (source?.examDate) {
      const msLeft = new Date(source.examDate).getTime() - Date.now();
      daysUntilExam = Math.max(0, Math.ceil(msLeft / 86_400_000));
    }

    return NextResponse.json({
      ...result,
      examDate: source?.examDate ?? null,
      examName: source?.examName ?? null,
      daysUntilExam,
    });
  } catch (error) {
    console.error('Error computing readiness score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
