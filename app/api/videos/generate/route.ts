import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
// Deprecated: mock pipeline removed. This endpoint is deprecated in favor of /api/videos/process

export async function POST(request: NextRequest) {
  try {
    getAuthUser(request);

    const { youtubeUrl } = await request.json();

    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
    if (!youtubeRegex.test(youtubeUrl.trim())) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    // This endpoint is deprecated now that the mock pipeline is removed.
    // Clients should call /api/videos/process instead (Phase 5 pipeline).
    return NextResponse.json(
      {
        error: 'Deprecated endpoint. Use /api/videos/process instead.',
        status: 410,
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('Error processing video with mock pipeline:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
