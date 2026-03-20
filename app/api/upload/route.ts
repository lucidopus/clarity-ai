import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getSupabase, UPLOADS_BUCKET } from '@/lib/supabase';

interface DecodedToken {
  userId: string;
  iat: number;
  exp: number;
}

const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  // Audio
  'audio/mpeg',      // .mp3
  'audio/wav',       // .wav
  'audio/x-wav',     // .wav (alt)
  'audio/mp4',       // .m4a
  'audio/x-m4a',     // .m4a (alt)
  'audio/flac',      // .flac
  'audio/ogg',       // .ogg
  'audio/webm',      // .webm
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function authenticate(request: NextRequest): DecodedToken {
  const token = request.cookies.get('jwt')?.value;
  if (!token) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
}

/**
 * POST /api/upload — Upload a file to Supabase Storage
 * Returns the public URL for the uploaded file.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = authenticate(request);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: PDF, PPTX, MP3, WAV, M4A, FLAC, OGG, WebM` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 25 MB.` },
        { status: 400 }
      );
    }

    // Build storage path: uploads/{userId}/{uuid}/{originalName}
    const fileId = crypto.randomUUID();
    const ext = file.name.split('.').pop() || 'bin';
    const storagePath = `${decoded.userId}/${fileId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabase();

    const { error: uploadError } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(UPLOADS_BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      fileId,
      fileUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
