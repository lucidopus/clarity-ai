import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClarityInsights } from '@/lib/services/clarityInsights';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const result = await getClarityInsights(decoded.userId);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Error computing clarity insights:', error);
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500);
  }
}
