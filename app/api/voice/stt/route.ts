import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Groq from 'groq-sdk';
import { checkRateLimitMongo } from '@/lib/rate-limit';
import { RATE_LIMITS, INPUT_LIMITS } from '@/lib/limits';

interface DecodedToken { userId: string }
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // Rate limit: 30 STT requests per 10 minutes per user
    const rl = await checkRateLimitMongo(`stt:${decoded.userId}`, RATE_LIMITS.stt.max, RATE_LIMITS.stt.windowSec);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } });
    }

    const form = await request.formData();
    const audio = form.get('audio');
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: 'audio required' }, { status: 400 });
    }

    if (audio.size > INPUT_LIMITS.sttAudioBytes) {
      return NextResponse.json({ error: `Audio file must be under ${INPUT_LIMITS.sttAudioBytes / (1024 * 1024)}MB` }, { status: 400 });
    }

    // FormData only returns string | File; after the Blob guard, audio is always a File
    const file = audio as File;

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
    });

    return NextResponse.json({ text: transcription.text ?? '' });
  } catch (error) {
    console.error('STT route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
