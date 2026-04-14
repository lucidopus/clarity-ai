import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import Groq from 'groq-sdk';
import { checkRateLimitMongo } from '@/lib/rate-limit';
import { RATE_LIMITS, INPUT_LIMITS } from '@/lib/limits';
import { internalServerError } from '@/lib/errors/apiResponse';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

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
    return internalServerError();
  }
}
