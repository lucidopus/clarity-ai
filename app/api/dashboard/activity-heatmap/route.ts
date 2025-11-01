import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { ActivityLog } from '@/lib/models';
import mongoose from 'mongoose';

interface DecodedToken { userId: string }

type View = 'month' | 'year';

function formatYmd(date: Date): string {
  // Use UTC methods to ensure consistent date formatting
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calcLevel(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  return 3;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userId } = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const { searchParams } = new URL(request.url);
    const view = (searchParams.get('view') as View) || 'month';

    // Normalize to start of today in UTC (to match how we store activity dates)
    const now = new Date();

    // Extend endDate to the last day of the current month
    // This ensures the entire current month is visible as soon as it starts
    const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 0, 0, 0, 0)); // Last day of current month

    const startDate = new Date(endDate);
    startDate.setUTCDate(endDate.getUTCDate() - (view === 'year' ? 364 : 29));

    await dbConnect();

    const agg = await ActivityLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
      { $sort: { date: 1 } },
    ]);

    const map = new Map<string, number>();
    for (const r of agg) map.set(r.date, r.count);

    const activities: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 }> = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = formatYmd(cursor);
      const count = map.get(key) || 0;
      activities.push({ date: key, count, level: calcLevel(count) });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const totalActivities = activities.reduce((acc, a) => acc + a.count, 0);

    return NextResponse.json({
      activities,
      startDate: formatYmd(startDate),
      endDate: formatYmd(endDate),
      totalActivities,
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Failed to load activity heatmap', error);
    return NextResponse.json({ error: 'Failed to load activity heatmap' }, { status: 500 });
  }
}
