import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getSupabase, UPLOADS_BUCKET } from '@/lib/supabase';
import { checkRateLimit, recordFailedAttempt } from '@/lib/rate-limit-auth';

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

// Magic number signatures for allowed file types
const MAGIC_NUMBERS: Record<string, { bytes: number[]; offset?: number }[]> = {
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [{ bytes: [0x50, 0x4B, 0x03, 0x04] }], // PK (ZIP)
  'audio/mpeg': [{ bytes: [0xFF, 0xFB] }, { bytes: [0xFF, 0xF3] }, { bytes: [0xFF, 0xF2] }, { bytes: [0x49, 0x44, 0x33] }], // MP3 / ID3
  'audio/wav': [{ bytes: [0x52, 0x49, 0x46, 0x46] }], // RIFF
  'audio/x-wav': [{ bytes: [0x52, 0x49, 0x46, 0x46] }],
  'audio/mp4': [{ bytes: [0x00, 0x00, 0x00], offset: 0 }], // ftyp container (loosely)
  'audio/x-m4a': [{ bytes: [0x00, 0x00, 0x00], offset: 0 }],
  'audio/flac': [{ bytes: [0x66, 0x4C, 0x61, 0x43] }], // fLaC
  'audio/ogg': [{ bytes: [0x4F, 0x67, 0x67, 0x53] }], // OggS
  'audio/webm': [{ bytes: [0x1A, 0x45, 0xDF, 0xA3] }], // EBML (WebM/MKV)
};

// MIME type to safe extension mapping
const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/flac': 'flac',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

function validateMagicNumber(buffer: ArrayBuffer, mimeType: string): boolean {
  const signatures = MAGIC_NUMBERS[mimeType];
  if (!signatures) return false;

  const view = new Uint8Array(buffer);
  return signatures.some(sig => {
    const offset = sig.offset ?? 0;
    return sig.bytes.every((byte, i) => view[offset + i] === byte);
  });
}

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

    // Rate limiting: 10 uploads per hour per user
    const uploadRateKey = `upload:${decoded.userId}`;
    const { limited, retryAfterMs } = checkRateLimit(uploadRateKey, 10, 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { error: `Upload rate limit exceeded. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.` },
        { status: 429 }
      );
    }

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

    // Validate magic number (file content matches claimed MIME type)
    const arrayBuffer = await file.arrayBuffer();
    if (!validateMagicNumber(arrayBuffer, file.type)) {
      return NextResponse.json(
        { error: 'File content does not match the declared file type' },
        { status: 400 }
      );
    }

    // Record the upload attempt for rate limiting
    recordFailedAttempt(uploadRateKey, 60 * 60 * 1000);

    // Build storage path: uploads/{userId}/{uuid}/{safe extension from MIME type}
    const fileId = crypto.randomUUID();
    const ext = MIME_TO_EXT[file.type] || 'bin';
    const storagePath = `${decoded.userId}/${fileId}.${ext}`;

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
