import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import Groq from 'groq-sdk';
import { checkRateLimitMongo } from '@/lib/rate-limit';
import { RATE_LIMITS, INPUT_LIMITS } from '@/lib/limits';
import { GROQ_TTS_COST_PER_MILLION_CHARS } from '@/lib/cost/config';
import { logGenerationCost, formatCost } from '@/lib/cost/logger';
import { CostSource, ServiceType } from '@/lib/models/Cost';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TTS_MODEL = 'canopylabs/orpheus-v1-english';

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

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
      model: TTS_MODEL,
      voice: (process.env.GROQ_TTS_VOICE ?? 'hannah') as 'hannah',
      input: text,
      response_format: 'wav',
      speed,
    });

    const buffer = await speech.arrayBuffer();

    // Log Orpheus TTS cost (best-effort — never block audio response)
    try {
      const charCount = text.length;
      const cost = Math.round((charCount / 1_000_000) * GROQ_TTS_COST_PER_MILLION_CHARS * 1_000_000) / 1_000_000;
      await logGenerationCost({
        userId: decoded.userId,
        source: CostSource.LEARNING_CHATBOT,
        services: [{
          service: ServiceType.GROQ_TTS,
          usage: {
            cost,
            unitDetails: {
              metadata: {
                model: TTS_MODEL,
                voice: process.env.GROQ_TTS_VOICE ?? 'hannah',
                charCount,
                invoker: 'voice_tts_route',
              },
            },
          },
          status: 'success',
        }],
        totalCost: cost,
      });
      console.log(`💰 [COST] Orpheus TTS: ${formatCost(cost)} (${charCount} chars @ ${TTS_MODEL})`);
    } catch (costError) {
      console.error('⚠️ [TTS] Failed to log Orpheus cost (non-critical):', costError);
    }

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
