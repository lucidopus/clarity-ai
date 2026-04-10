import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Source from '@/lib/models/Source';

interface DecodedToken {
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const { sourceId, examDate, examName } = await request.json();

    if (!sourceId || !examDate) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceId, examDate' },
        { status: 400 }
      );
    }

    await dbConnect();

    const updated = await Source.findOneAndUpdate(
      { sourceId, userId: decoded.userId },
      { $set: { examDate: new Date(examDate), examName: examName ?? null } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, examDate: updated.examDate, examName: updated.examName });
  } catch (error) {
    console.error('Error setting exam date:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
