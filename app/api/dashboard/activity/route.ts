import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { ActivityLog, Video } from '@/lib/models';

interface DecodedToken { userId: string }

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userId } = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    await dbConnect();

    // Last 7 days activity counts
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const agg = await ActivityLog.aggregate([
      { $match: { userId: new (await import('mongoose')).default.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
      { $sort: { date: 1 } },
    ]);

    const map = new Map<string, number>();
    for (const r of agg) map.set(r.date, r.count);

    const weeklyActivity: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = formatYmd(d);
      weeklyActivity.push({ date: key, count: map.get(key) || 0 });
    }

    // Recent videos (last 5)
    const recent = await Video.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();

    // Optionally add lightweight stats per video (e.g., flashcards count)
    const recentVideos = await Promise.all(recent.map(async (v) => {
      const [flashcardCount, quizCount] = await Promise.all([
        (await import('@/lib/models')).Flashcard.countDocuments({ videoId: v._id }),
        (await import('@/lib/models')).Quiz.countDocuments({ videoId: v._id }),
      ]);

      return {
        _id: v._id,
        title: v.title,
        videoId: v.videoId,
        thumbnail: v.thumbnail,
        createdAt: v.createdAt,
        channelName: v.channelName,
        duration: v.duration,
        processingStatus: v.processingStatus,
        flashcardCount,
        quizCount,
      };
    }));

    return NextResponse.json({ weeklyActivity, recentVideos });
  } catch (error) {
    console.error('Failed to load dashboard activity', error);
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }
}
