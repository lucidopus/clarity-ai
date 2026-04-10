import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { ActivityLog, Video, Flashcard, Quiz } from '@/lib/models';

interface DecodedToken { userId: string }

function formatYmd(date: Date): string {
  // Use UTC methods to ensure consistent date formatting
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userId } = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    await dbConnect();

    // Last 7 days activity counts (use UTC to match stored dates)
    const now = new Date();
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 6);

    const agg = await ActivityLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
      { $sort: { date: 1 } },
    ]);

    const map = new Map<string, number>();
    for (const r of agg) map.set(r.date, r.count);

    const weeklyActivity: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = formatYmd(d);
      weeklyActivity.push({ date: key, count: map.get(key) || 0 });
    }

    // Recent videos (last 5)
    const recent = await Video.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();

    // Batch-fetch flashcard and quiz counts for all recent videos in 2 queries instead of 2×N
    const sourceIds = recent.map((v) => v.videoId);
    const [flashcardCounts, quizCounts] = await Promise.all([
      Flashcard.aggregate([
        { $match: { sourceId: { $in: sourceIds } } },
        { $group: { _id: '$sourceId', count: { $sum: 1 } } },
      ]),
      Quiz.aggregate([
        { $match: { sourceId: { $in: sourceIds } } },
        { $group: { _id: '$sourceId', count: { $sum: 1 } } },
      ]),
    ]);

    const fcMap = new Map(flashcardCounts.map((r: { _id: string; count: number }) => [r._id, r.count]));
    const qzMap = new Map(quizCounts.map((r: { _id: string; count: number }) => [r._id, r.count]));

    const recentVideos = recent.map((v) => ({
      _id: v._id,
      title: v.title,
      videoId: v.videoId,
      thumbnail: v.thumbnail,
      createdAt: v.createdAt,
      channelName: v.channelName,
      duration: v.duration,
      processingStatus: v.processingStatus,
      flashcardCount: fcMap.get(v.videoId) ?? 0,
      quizCount: qzMap.get(v.videoId) ?? 0,
    }));

    return NextResponse.json({ weeklyActivity, recentVideos }, {
      headers: { 'Cache-Control': 'private, max-age=120' },
    });
  } catch (error) {
    console.error('Failed to load dashboard activity', error);
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }
}
