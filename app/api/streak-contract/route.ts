import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { validateStudyContract, computeNextReminderAt } from '@/lib/services/studyContract';
import { internalServerError } from '@/lib/errors/apiResponse';

const contractSchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  timezone: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();

    const body = await request.json();
    const parsed = contractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'windowStart, windowEnd, and timezone are required.' },
        { status: 400 },
      );
    }
    const { windowStart, windowEnd, timezone } = parsed.data;
    const invalid = validateStudyContract(windowStart, windowEnd, timezone);
    if (invalid) {
      return NextResponse.json({ success: false, message: invalid }, { status: 400 });
    }

    const contract = {
      windowStart,
      windowEnd,
      timezone,
      contractedAt: new Date(),
    };
    const nextReminderAt = computeNextReminderAt(windowStart, timezone);
    await User.updateOne(
      { _id: decoded.userId },
      { $set: { studyContract: contract, nextReminderAt } },
    );

    return NextResponse.json({ success: true, studyContract: contract });
  } catch (error) {
    console.error('Error saving study contract:', error);
    return internalServerError();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    await dbConnect();
    await User.updateOne(
      { _id: decoded.userId },
      { $set: { studyContract: null, nextReminderAt: null } },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing study contract:', error);
    return internalServerError();
  }
}
