import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import SourceContent from '@/lib/models/SourceContent';
import { extractDocument } from '@/lib/extractors/document';
// safeFetch is used indirectly via extractDocument which calls it internally

interface DecodedToken {
  userId: string;
  iat: number;
  exp: number;
}

function authenticate(request: NextRequest): DecodedToken {
  const token = request.cookies.get('jwt')?.value;
  if (!token) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/live-lecture/extract-context — Extract text from uploaded context doc
// Creates a SourceContent record so the ask route can use it for Q&A context
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const decoded = authenticate(request);
    await dbConnect();

    const { fileUrl, fileName, mimeType } = await request.json();

    if (!fileUrl || !fileName || !mimeType) {
      return NextResponse.json(
        { error: 'fileUrl, fileName, and mimeType are required' },
        { status: 400 }
      );
    }

    // Extract document content (PDF or PPTX)
    const result = await extractDocument({ sourceType: 'document', fileUrl, fileName, mimeType });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to extract document content' },
        { status: 422 }
      );
    }

    if (!result.text) {
      return NextResponse.json(
        { error: 'Failed to extract document content' },
        { status: 422 }
      );
    }

    // Generate a stable sourceId for this context doc
    const sourceId = crypto.randomUUID();

    // Build segments for SourceContent
    const segments = (result.segments || []).map((s) => ({
      text: s.text,
      page: s.page,
    }));

    const fullText = result.text;
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    // Create SourceContent record
    await SourceContent.create({
      sourceId,
      userId: decoded.userId,
      fullText,
      wordCount,
      segments,
    });

    return NextResponse.json({
      success: true,
      sourceId,
      title: result.title,
      wordCount,
      pageCount: result.metadata?.pageCount || segments.length,
    });
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[LIVE-LECTURE] Extract context error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
