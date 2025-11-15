import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { ActivityLog, type ActivityType } from '@/lib/models';
import { resolveClientDay } from '@/lib/date.utils';

interface DecodedToken {
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const body = await request.json();
    const {
      activityType,
      videoId,
      metadata,
      clientTimestamp,
      timezoneOffsetMinutes,
      timeZone,
    } = body as {
      activityType: ActivityType;
      videoId?: string;
      metadata?: Record<string, unknown>;
      clientTimestamp?: string;
      timezoneOffsetMinutes?: number;
      timeZone?: string;
    };

    if (!activityType) {
      return NextResponse.json({ error: 'activityType is required' }, { status: 400 });
    }

    await dbConnect();

    const { now, startOfDay } = resolveClientDay({ clientTimestamp, timezoneOffsetMinutes });
    const metadataWithTimezone = {
      ...(metadata || {}),
      ...(timeZone ? { clientTimeZone: timeZone } : {}),
      ...(typeof timezoneOffsetMinutes === 'number' ? { clientTimezoneOffsetMinutes: timezoneOffsetMinutes } : {}),
    };
    const metadataPayload = Object.keys(metadataWithTimezone).length > 0 ? metadataWithTimezone : undefined;

    console.log(`[ACTIVITY LOG] Logging activity: ${activityType}`);
    console.log(`[ACTIVITY LOG] Current time: ${now.toISOString()}`);
    console.log(`[ACTIVITY LOG] Date for storage: ${startOfDay.toISOString()}`);

    const doc = await ActivityLog.create({
      userId: decoded.userId,
      activityType,
      videoId: videoId || undefined,
      date: startOfDay,
      timestamp: now,
      metadata: metadataPayload,
    });

    return NextResponse.json({ success: true, id: doc._id });
  } catch (error) {
    console.error('Failed to log activity', error);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}
