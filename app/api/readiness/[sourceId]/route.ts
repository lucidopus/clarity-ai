import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getReadinessScore } from '@/lib/services/readinessScore';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const decoded = getAuthUser(request);
    const { sourceId } = await params;

    const result = await getReadinessScore(decoded.userId, sourceId);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Error computing clarity score:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}
