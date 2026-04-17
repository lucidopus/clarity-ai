import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import Groq from 'groq-sdk';
import { checkRateLimitMongo } from '@/lib/rate-limit';
import { RATE_LIMITS, INPUT_LIMITS } from '@/lib/limits';
import { internalServerError } from '@/lib/errors/apiResponse';
import { WHISPER_COSTS_PER_SECOND } from '@/lib/cost/config';
import { logGenerationCost, formatCost } from '@/lib/cost/logger';
import { CostSource, ServiceType } from '@/lib/models/Cost';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const STT_MODEL = 'whisper-large-v3-turbo';

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
    const videoId = form.get('videoId');
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: 'audio required' }, { status: 400 });
    }

    if (audio.size > INPUT_LIMITS.sttAudioBytes) {
      return NextResponse.json({ error: `Audio file must be under ${INPUT_LIMITS.sttAudioBytes / (1024 * 1024)}MB` }, { status: 400 });
    }

    // FormData only returns string | File; after the Blob guard, audio is always a File
    const file = audio as File;

    // Request verbose_json so Groq returns the audio duration — needed for
    // per-second billing. Falls back to 0 if the provider omits it.
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: STT_MODEL,
      response_format: 'verbose_json',
    });

    const duration = (transcription as unknown as { duration?: number }).duration ?? 0;

    // Log Whisper cost (best-effort — never block the user-facing response)
    try {
      const perSecond = WHISPER_COSTS_PER_SECOND[STT_MODEL];
      if (perSecond && duration > 0) {
        const cost = Math.round(duration * perSecond * 1_000_000) / 1_000_000;
        await logGenerationCost({
          userId: decoded.userId,
          source: CostSource.LEARNING_CHATBOT,
          ...(typeof videoId === 'string' && videoId ? { sourceId: videoId } : {}),
          services: [{
            service: ServiceType.GROQ_WHISPER,
            usage: {
              cost,
              unitDetails: {
                duration,
                metadata: { model: STT_MODEL, invoker: 'voice_stt_route' },
              },
            },
            status: 'success',
          }],
          totalCost: cost,
        });
        console.log(`💰 [COST] Whisper STT: ${formatCost(cost)} (${duration}s @ ${STT_MODEL})`);
      }
    } catch (costError) {
      console.error('⚠️ [STT] Failed to log Whisper cost (non-critical):', costError);
    }

    return NextResponse.json({ text: transcription.text ?? '' });
  } catch (error) {
    console.error('STT route error:', error);
    return internalServerError();
  }
}
