import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import { clearSessionHeartbeat } from '@/lib/live-lecture/redis';

// POST /api/live-lecture/force-end
// Marks all of the user's active sessions as `interrupted` and clears their
// Redis heartbeat keys. Does NOT trigger the post-session pipeline — the
// transcript may be empty/partial and is preserved on the document for later
// manual recovery if desired.
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const active = (await LiveSession.find(
      { userId: decoded.userId, status: 'active' },
      { sessionId: 1 },
    ).lean()) as unknown as Array<{ sessionId: string }>;

    if (active.length === 0) {
      return NextResponse.json({ success: true, endedCount: 0 });
    }

    await LiveSession.updateMany(
      { userId: decoded.userId, status: 'active' },
      { $set: { status: 'interrupted', endedAt: new Date() } },
    );

    await Promise.all(
      active.map((s) => clearSessionHeartbeat(s.sessionId).catch(() => {})),
    );

    return NextResponse.json({ success: true, endedCount: active.length });
  } catch (error) {
    console.error('❌ [LIVE-LECTURE] force-end error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
