import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { llm } from '@/lib/sdk';
import { checkChatbotRateLimit } from '@/lib/rate-limit-chatbot';
import { AI_GUIDE_SYSTEM_PROMPT } from '@/lib/prompts';
import { LearningMaterial, Solution } from '@/lib/models';
import { saveChatMessage } from '@/lib/chat-db';
import { generateSessionId, generateMessageId } from '@/lib/types/chat';
import { calculateLLMCost, getCurrentModelInfo } from '@/lib/cost/calculator';
import { logGenerationCost, formatCost } from '@/lib/cost/logger';
import { CostSource, ServiceType } from '@/lib/models/Cost';
import type { IServiceUsage } from '@/lib/models/Cost';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
    // Convert to LangChain message format
    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...(conversationHistory || []).slice(-8).map((msg: IChatMessage) => {
        if (msg.role === 'user') return new HumanMessage(msg.content);
        if (msg.role === 'assistant') return new AIMessage(msg.content);
        return new SystemMessage(msg.content);
      }),
      new HumanMessage(message)
    ];

    // 11. Call LLM with streaming using LangChain
    let promptTokens = 0;
    let completionTokens = 0;

    const stream = await llm.stream(langchainMessages, {
      callbacks: [
        {
          handleLLMEnd: (output) => {
            const tokenUsage = output.llmOutput?.tokenUsage;
            if (tokenUsage) {
              promptTokens = tokenUsage.promptTokens || 0;
              completionTokens = tokenUsage.completionTokens || 0;
            }
          },
        },
      ],
    });

    // 12. Create streaming response and accumulate assistant response
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
            let isEstimated = false;

             // Estimate tokens if not available from stream callback
            if (promptTokens === 0 && completionTokens === 0) {
              // Rough estimation: ~4 chars per token
              promptTokens = Math.ceil(message.length / 4);
              completionTokens = Math.ceil(assistantResponse.length / 4);
              isEstimated = true;
              console.warn('⚠️ [GUIDE CHATBOT] Using token estimation (LangChain callback did not provide usage)');
            }

            if (promptTokens > 0 || completionTokens > 0) {
              const llmCost = calculateLLMCost(promptTokens, completionTokens);
              const serviceType = modelInfo.model.includes('gemini') || modelInfo.model.includes('google')
                ? ServiceType.GEMINI_LLM
                : ServiceType.GROQ_LLM;

              const services: IServiceUsage[] = [
                {
                  service: serviceType,
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
                        estimated: isEstimated,
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
    return new NextResponse(readableStream, {
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
