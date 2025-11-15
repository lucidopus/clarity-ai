import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { groq } from '@/lib/sdk';
import { checkChatbotRateLimit } from '@/lib/rate-limit-chatbot';
import { AI_GUIDE_SYSTEM_PROMPT } from '@/lib/prompts';
import { LearningMaterial, Solution } from '@/lib/models';
import { saveChatMessage } from '@/lib/chat-db';
import { generateSessionId, generateMessageId } from '@/lib/types/chat';
import { calculateLLMCost, getCurrentModelInfo } from '@/lib/cost/calculator';
import { logGenerationCost, formatCost } from '@/lib/cost/logger';
import { CostSource, ServiceType } from '@/lib/models/Cost';
import type { IServiceUsage } from '@/lib/models/Cost';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

/**
 * POST /api/chatbot/guide
 * AI Guide for real-world problem-solving workspace
 * Uses "Supportive Domain Expert" persona to guide users through case studies
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // 2. Parse request
    const {
      videoId,
      problemId,
      message,
      conversationHistory,
      solutionDraft,
    } = await request.json();

    if (!videoId || !problemId || !message) {
      return NextResponse.json(
        { error: 'videoId, problemId, and message are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 3. Rate limiting (same as chatbot)
    const rateLimit = await checkChatbotRateLimit(decoded.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimit.retryAfter
      }, {
        status: 429,
        headers: {
          'Retry-After': rateLimit.retryAfter?.toString() || '60'
        }
      });
    }

    // 4. Fetch learning material and problem details
    const learningMaterial = await LearningMaterial.findOne({
      videoId,
      userId: decoded.userId,
    });

    if (!learningMaterial) {
      return NextResponse.json(
        { error: 'Learning material not found' },
        { status: 404 }
      );
    }

    // 5. Find the specific problem
    const problem = learningMaterial.realWorldProblems?.find(
      (p: { id: string }) => p.id === problemId
    );

    if (!problem) {
      return NextResponse.json(
        { error: 'Problem not found' },
        { status: 404 }
      );
    }

    // 6. Fetch user's current solution draft (if any)
    const existingSolution = await Solution.findOne({
      userId: decoded.userId,
      videoId,
      problemId,
    });

    const incomingDraft = typeof solutionDraft === 'string' ? solutionDraft : undefined;

    // 7. Generate session and message identifiers
    const sessionId = generateSessionId(decoded.userId, videoId); // LEGACY
    const userMessageId = generateMessageId('user');
    const assistantMessageId = generateMessageId('assistant');

    // 8. Save user message to database
    try {
      const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      await saveChatMessage(
        sessionId,
        userMessageId,
        'user',
        message,
        decoded.userId,
        videoId,
        clientIp,
        'guide',   // channel
        problemId, // contextId (problemId for guide channel)
        problemId  // problemId
      );
    } catch (saveError) {
      console.error('Failed to save user message (guide):', saveError);
      // Continue anyway - don't block the response
    }

    // 9. Build AI Guide system prompt with context
    const systemPrompt = AI_GUIDE_SYSTEM_PROMPT({
      userProfile: { firstName: decoded.firstName },
      problemTitle: problem.title,
      problemScenario: problem.scenario,
      videoSummary: learningMaterial.videoSummary || 'No video summary available.',
      solutionDraft: incomingDraft ?? existingSolution?.content ?? '',
    });

    // 10. Prepare conversation history (last 4 exchanges = 8 messages)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-8),
      { role: 'user', content: message }
    ];

    // 11. Call Groq with streaming
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.8, // Slightly higher for more varied guidance
      max_tokens: 1024,
      stream: true,
    });

    // 12. Create streaming response and accumulate assistant response
    let assistantResponse = '';
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Track usage from response headers (if available)
          let promptTokens = 0;
          let completionTokens = 0;

          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              assistantResponse += content;
              controller.enqueue(new TextEncoder().encode(content));
            }
            // Capture usage data from chunk if available
            if (chunk.usage) {
              promptTokens = chunk.usage.prompt_tokens || 0;
              completionTokens = chunk.usage.completion_tokens || 0;
            }
          }
          controller.close();

          // Save assistant message after streaming completes
          try {
            const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
            await saveChatMessage(
              sessionId,
              assistantMessageId,
              'assistant',
              assistantResponse,
              decoded.userId,
              videoId,
              clientIp,
              'guide',   // channel
              problemId, // contextId (problemId for guide channel)
              problemId  // problemId
            );
          } catch (saveError) {
            console.error('Failed to save assistant message (guide):', saveError);
          }

          // 13. Log cost after streaming completes
          try {
            const modelInfo = getCurrentModelInfo();
            if (promptTokens > 0 || completionTokens > 0) {
              const llmCost = calculateLLMCost(promptTokens, completionTokens);
              const services: IServiceUsage[] = [
                {
                  service: ServiceType.GROQ_LLM,
                  usage: {
                    cost: llmCost,
                    unitDetails: {
                      inputTokens: promptTokens,
                      outputTokens: completionTokens,
                      totalTokens: promptTokens + completionTokens,
                      metadata: {
                        model: modelInfo.model,
                        messageLength: message.length,
                        responseLength: assistantResponse.length,
                        problemTitle: problem.title,
                      },
                    },
                  },
                  status: 'success',
                },
              ];

              await logGenerationCost({
                userId: decoded.userId,
                source: CostSource.CHALLENGE_CHATBOT,
                videoId: videoId,
                problemId: problemId,
                services,
                totalCost: llmCost,
              });

              console.log(`💰 [COST] Challenge chatbot (${modelInfo.model}): ${promptTokens} input + ${completionTokens} output tokens = ${formatCost(llmCost)}`);
            }
          } catch (costError) {
            console.error('⚠️ [CHALLENGE CHATBOT] Failed to log cost (non-critical):', costError);
            // Don't fail the entire request if cost logging fails
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    // 11. Return streaming response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
      },
    });

  } catch (error) {
    console.error('AI Guide API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
