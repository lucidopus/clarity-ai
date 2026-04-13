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

    const rl = await checkRateLimitMongo(`tts:${decoded.userId}`, RATE_LIMITS.tts.max, RATE_LIMITS.tts.windowSec);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } });
    }

    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    if (text.length > INPUT_LIMITS.ttsTextLength) {
      return NextResponse.json({ error: `Text must be under ${INPUT_LIMITS.ttsTextLength} characters` }, { status: 400 });
    }

    const speed = parseFloat(process.env.GROQ_TTS_SPEED ?? '1.1');
    const speech = await groq.audio.speech.create({
      model: 'canopylabs/orpheus-v1-english',
      voice: (process.env.GROQ_TTS_VOICE ?? 'hannah') as 'hannah',
      input: text,
      response_format: 'wav',
      speed,
    });

    const buffer = await speech.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    // Return 503 so the client falls back to browser TTS gracefully
    const message = error instanceof Error ? error.message : 'TTS failed';
    console.error('TTS route error:', message);
    return NextResponse.json({ error: 'TTS unavailable' }, { status: 503 });
  }
}
