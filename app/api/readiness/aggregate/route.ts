import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAggregateReadiness } from '@/lib/services/readinessScore';

interface DecodedToken {
  userId: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    const result = await getAggregateReadiness(decoded.userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching aggregate readiness:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
