import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import LiveSession from '@/lib/models/LiveSession';
import SourceContent from '@/lib/models/SourceContent';
import { getGeminiLlm } from '@/lib/sdk';
import { checkQARateLimit } from '@/lib/live-lecture/redis';
import { LIVE_LECTURE_QA_PROMPT, EXPLAIN_LAST_2_MIN_PROMPT } from '@/lib/live-lecture/prompts';
import { saveChatMessage } from '@/lib/chat-db';
import { generateSessionId, generateMessageId } from '@/lib/types/chat';
import { logGenerationCost } from '@/lib/cost/logger';
import { calculateLLMCost } from '@/lib/cost/calculator';
import { CostSource, ServiceType } from '@/lib/models/Cost';
import type { IServiceUsage } from '@/lib/models/Cost';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { parseJsonBody, isErrorResponse } from '@/lib/utils/api';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
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
// POST /api/live-lecture/ask — Q&A during live lecture (streaming)
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const decoded = authenticate(request);
    await dbConnect();

    const bodyOrError = await parseJsonBody<{
      sessionId?: string;
      message?: string;
      isExplainLast2Min?: boolean;
      partialTranscript?: string;
    }>(request, 256_000); // 256KB max
    if (isErrorResponse(bodyOrError)) return bodyOrError;
    const { sessionId, message, isExplainLast2Min, partialTranscript } = bodyOrError;

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 });
    }

    // Rate limit
    const rateCheck = await checkQARateLimit(decoded.userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many questions. Please wait a moment.', remaining: rateCheck.remaining },
        { status: 429 }
      );
    }

    // Fetch session
    const session = await LiveSession.findOne({
      sessionId,
      userId: decoded.userId,
      status: 'active',
    });

    if (!session) {
      return NextResponse.json({ error: 'Active session not found' }, { status: 404 });
    }

    // Build transcript text
    let transcriptText: string;
    const segments = session.transcriptSegments || [];

    if (isExplainLast2Min) {
      // Use MongoDB $filter projection for efficiency — only last 120 seconds
      const currentDuration = (Date.now() - session.startedAt.getTime()) / 1000;
      const cutoff = Math.max(0, currentDuration - 120);
      const recentSegments = segments.filter(
        (s: { startOffset: number }) => s.startOffset >= cutoff
      );
      transcriptText = recentSegments
        .map((s: { text: string }) => s.text)
        .join(' ');
    } else {
      transcriptText = segments
        .map((s: { text: string }) => s.text)
        .join(' ');
    }

    // Append partial transcript (words heard but not yet committed by Scribe)
    // This ensures the LLM has the most up-to-date context possible
    if (partialTranscript && typeof partialTranscript === 'string' && partialTranscript.trim()) {
      transcriptText = transcriptText
        ? `${transcriptText} ${partialTranscript.trim()}`
        : partialTranscript.trim();
    }

    // Fetch context documents (truncated to stay within reasonable prompt size)
    // Gemini has a large context window but we cap to keep responses fast
    const MAX_CONTEXT_CHARS_PER_DOC = 30000;
    const contextDocTexts: string[] = [];
    if (session.contextDocIds && session.contextDocIds.length > 0) {
      const contextDocs = await SourceContent.find({
        sourceId: { $in: session.contextDocIds },
        userId: decoded.userId,
      });
      for (const doc of contextDocs) {
        if (doc.fullText) {
          const text = doc.fullText.length > MAX_CONTEXT_CHARS_PER_DOC
            ? doc.fullText.slice(0, MAX_CONTEXT_CHARS_PER_DOC) + '\n... (document truncated for context window)'
            : doc.fullText;
          contextDocTexts.push(text);
        }
      }
    }

    // Build prompt
    const systemPrompt = isExplainLast2Min
      ? EXPLAIN_LAST_2_MIN_PROMPT({
          lectureTitle: session.title,
          recentTranscriptText: transcriptText,
          contextDocTexts: contextDocTexts.length > 0 ? contextDocTexts : undefined,
        })
      : LIVE_LECTURE_QA_PROMPT({
          lectureTitle: session.title,
          transcriptText,
          contextDocTexts: contextDocTexts.length > 0 ? contextDocTexts : undefined,
        });

    // Call Gemini via LangChain (streaming) — larger context window than Groq
    const gemini = getGeminiLlm();
    const langchainMessages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ];

    let promptTokens = 0;
    let completionTokens = 0;

    const stream = await gemini.stream(langchainMessages, {
      callbacks: [{
        handleLLMEnd: (output) => {
          const tokenUsage = output.llmOutput?.tokenUsage;
          if (tokenUsage) {
            promptTokens = tokenUsage.promptTokens || 0;
            completionTokens = tokenUsage.completionTokens || 0;
          }
        },
      }],
    });

    // Save user message
    const legacySessionId = generateSessionId(decoded.userId, sessionId);
    const userMessageId = generateMessageId('user');
    const assistantMessageId = generateMessageId('assistant');
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;

    try {
      await saveChatMessage(
        legacySessionId, userMessageId, 'user', message,
        decoded.userId, sessionId, clientIp,
        'live_lecture', sessionId, undefined
      );
    } catch {
      // Non-critical
    }

    // Stream response
    let assistantResponse = '';
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.content as string;
            if (content) {
              assistantResponse += content;
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();

          // Save assistant message
          try {
            await saveChatMessage(
              legacySessionId, assistantMessageId, 'assistant', assistantResponse,
              decoded.userId, sessionId, clientIp,
              'live_lecture', sessionId, undefined
            );
          } catch {
            // Non-critical
          }

          // Increment question count
          await LiveSession.updateOne(
            { _id: session._id },
            { $inc: { questionCount: 1 } }
          );

          // Log cost
          try {
            if (promptTokens === 0 && completionTokens === 0) {
              promptTokens = Math.ceil(message.length / 4);
              completionTokens = Math.ceil(assistantResponse.length / 4);
            }

            const model = process.env.CONTENT_GENERATION_MODEL || 'gemini-2.0-flash';
            const llmCost = calculateLLMCost(promptTokens, completionTokens, model);
            const services: IServiceUsage[] = [{
              service: ServiceType.GEMINI_LLM,
              usage: {
                cost: llmCost,
                unitDetails: {
                  inputTokens: promptTokens,
                  outputTokens: completionTokens,
                  totalTokens: promptTokens + completionTokens,
                  metadata: { isExplainLast2Min, segmentCount: segments.length },
                },
              },
              status: 'success',
            }];

            await logGenerationCost({
              userId: decoded.userId,
              source: CostSource.LIVE_LECTURE_QA,
              sourceId: sessionId,
              services,
              totalCost: llmCost,
            });
          } catch {
            // Non-critical
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-RateLimit-Remaining': rateCheck.remaining.toString(),
      },
    });
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('❌ [LIVE-LECTURE] Ask error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
