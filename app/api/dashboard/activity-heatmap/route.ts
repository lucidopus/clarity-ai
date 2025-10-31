import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { ActivityLog } from '@/lib/models';
import mongoose from 'mongoose';

interface DecodedToken { userId: string }

type View = 'month' | 'year';

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
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

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (view === 'year' ? 364 : 29));
    startDate.setHours(0, 0, 0, 0);

    await dbConnect();

    const agg = await ActivityLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
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
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalActivities = activities.reduce((acc, a) => acc + a.count, 0);

    return NextResponse.json({
      activities,
      startDate: formatYmd(startDate),
      endDate: formatYmd(endDate),
      totalActivities,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load activity heatmap' }, { status: 500 });
  }
}
