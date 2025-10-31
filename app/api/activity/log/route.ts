import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { ActivityLog, type ActivityType } from '@/lib/models';

interface DecodedToken {
  userId: string;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const body = await request.json();
    const { activityType, videoId, metadata } = body as { activityType: ActivityType; videoId?: string; metadata?: Record<string, unknown> };

    if (!activityType) {
      return NextResponse.json({ error: 'activityType is required' }, { status: 400 });
    }

    await dbConnect();

    const now = new Date();
    const doc = await ActivityLog.create({
      userId: decoded.userId,
      activityType,
      videoId: videoId || undefined,
      date: startOfDay(now),
      timestamp: now,
      metadata: metadata || undefined,
    });

    return NextResponse.json({ success: true, id: doc._id });
  } catch (error) {
    console.error('Failed to log activity', error);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}
