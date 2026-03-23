import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { groqLlm, GROQ_MODEL_NAME } from '@/lib/sdk';
import { getChatbotContext } from '@/lib/chatbot-context';
import { checkChatbotRateLimit } from '@/lib/rate-limit-chatbot';
import { CHATBOT_SYSTEM_PROMPT, ANIMATION_TOOL_PROMPT_ADDENDUM } from '@/lib/prompts';
import ActivityLog from '@/lib/models/ActivityLog';
import { saveChatMessage } from '@/lib/chat-db';
import { generateSessionId, generateMessageId } from '@/lib/types/chat';
import { resolveClientDay } from '@/lib/date.utils';
import { calculateLLMCost, getCurrentModelInfo } from '@/lib/cost/calculator';
import { logGenerationCost, formatCost } from '@/lib/cost/logger';
import { CostSource, ServiceType } from '@/lib/models/Cost';
import type { IServiceUsage } from '@/lib/models/Cost';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import type { AIMessageChunk } from '@langchain/core/messages';
import { ToolCallAccumulator } from '@/lib/tools';
import { renderAnimationTool } from '@/lib/tools/render-animation';
import { AnimationSpecSchema } from '@/lib/types/animation';

const ANIMATION_TOOL_ENABLED = process.env.ENABLE_ANIMATION_TOOL === 'true';

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
      message,
      conversationHistory,
      clientTimestamp,
      timezoneOffsetMinutes,
      timeZone,
      forceVisualize,
    } = await request.json();
    if (!videoId || !message) {
      return NextResponse.json({ error: 'videoId and message are required' }, { status: 400 });
    }

    // /visualize command auto-enables animation tool for this request
    const useAnimationTool = ANIMATION_TOOL_ENABLED || forceVisualize === true;

    await dbConnect();

    // 3. Rate limiting
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

    // 4. Generate session and message identifiers
    const sessionId = generateSessionId(decoded.userId, videoId); // LEGACY
    const userMessageId = generateMessageId('user');
    const assistantMessageId = generateMessageId('assistant');

    // 5. Save user message to database
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
        'chatbot', // channel
        videoId,   // contextId (same as videoId for chatbot channel)
        undefined  // problemId (not used for chatbot channel)
      );
    } catch (saveError) {
      console.error('Failed to save user message:', saveError);
      // Continue anyway - don't block the response
    }

    // 6. Fetch context
    const context = await getChatbotContext(decoded.userId, videoId);

    // 7. Build system prompt (append animation tool addendum if enabled)
    let systemPrompt = CHATBOT_SYSTEM_PROMPT(context);
    if (useAnimationTool) {
      systemPrompt += ANIMATION_TOOL_PROMPT_ADDENDUM;
      if (forceVisualize) {
        systemPrompt += '\n\nThe user explicitly requested a visualization via /visualize. If the concept genuinely maps to one of your 8 animation types (functions, vectors, matrices, shapes, number lines, unit circle, derivatives, integrals), use the render_animation tool and pair it with a text explanation. If the concept does NOT fit any template (e.g., algorithms, data structures, code concepts, NLP processes), do NOT use the tool — instead explain why a visual animation isn\'t available for this concept and provide an excellent text-based explanation with examples, ASCII diagrams, or step-by-step walkthroughs.';
      }
    }

    // 8. Prepare conversation history (last 3 exchanges = 6 messages)
    // Convert to LangChain message format
    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...(conversationHistory || []).slice(-6).map((msg: IChatMessage) => {
        if (msg.role === 'user') return new HumanMessage(msg.content);
        if (msg.role === 'assistant') return new AIMessage(msg.content);
        return new SystemMessage(msg.content);
      }),
      new HumanMessage(message)
    ];

    // 9. Call LLM with streaming using LangChain
    // Optionally bind animation tool
    const model = useAnimationTool
      ? groqLlm.bindTools([renderAnimationTool])
      : groqLlm;

    let promptTokens = 0;
    let completionTokens = 0;

    const stream = await model.stream(langchainMessages, {
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

    // 10. Create streaming response and accumulate assistant response
    let assistantResponse = '';
    let animationEmitted = false;
    const toolAccumulator = new ToolCallAccumulator();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();

          for await (const chunk of stream) {
            // Stream text content immediately
            const content = (chunk as AIMessageChunk).content as string;
            if (content) {
              assistantResponse += content;
              controller.enqueue(encoder.encode(content));
            }

            // Accumulate tool call chunks (if any)
            if (useAnimationTool) {
              toolAccumulator.addChunk(chunk as AIMessageChunk);
            }
          }

          // After streaming ends, check for tool calls and emit animation blocks
          if (useAnimationTool && toolAccumulator.hasToolCalls()) {
            const toolCalls = toolAccumulator.getToolCalls();

            for (const tc of toolCalls) {
              if (tc.name === 'render_animation') {
                // Validate the AnimationSpec
                const parsed = AnimationSpecSchema.safeParse(tc.args);

                if (parsed.success) {
                  const animationBlock = `\n\n\`\`\`animation\n${JSON.stringify(parsed.data)}\n\`\`\``;
                  assistantResponse += animationBlock;
                  controller.enqueue(encoder.encode(animationBlock));
                  animationEmitted = true;
                } else {
                  console.warn('[CHATBOT] Invalid AnimationSpec from LLM:', parsed.error.message);
                  // Fallback: just add a note about the visualization
                  const fallbackNote = '\n\n> *Animation could not be generated for this explanation.*';
                  assistantResponse += fallbackNote;
                  controller.enqueue(encoder.encode(fallbackNote));
                }
              }
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
              'chatbot', // channel
              videoId,   // contextId (same as videoId for chatbot channel)
              undefined  // problemId (not used for chatbot channel)
            );
          } catch (saveError) {
            console.error('Failed to save assistant message:', saveError);
          }

          // Log animation activity if emitted
          if (animationEmitted) {
            try {
              const { now, startOfDay } = resolveClientDay({ clientTimestamp, timezoneOffsetMinutes });
              await ActivityLog.create({
                userId: decoded.userId,
                activityType: 'animation_rendered',
                sourceId: videoId,
                date: startOfDay,
                timestamp: now,
                metadata: {
                  animationType: toolAccumulator.getToolCalls().find(tc => tc.name === 'render_animation')?.args?.type,
                },
              });
            } catch (logError) {
              console.error('Failed to log animation activity:', logError);
            }
          }

          // 13. Log cost after streaming completes
          try {
            const modelInfo = getCurrentModelInfo(GROQ_MODEL_NAME);
            let isEstimated = false;

            // Estimate tokens if not available from stream callback
            if (promptTokens === 0 && completionTokens === 0) {
              // Rough estimation: ~4 chars per token
              promptTokens = Math.ceil(message.length / 4);
              completionTokens = Math.ceil(assistantResponse.length / 4);
              isEstimated = true;
              console.warn('⚠️ [CHATBOT] Using token estimation (LangChain callback did not provide usage)');
            }

            if (promptTokens > 0 || completionTokens > 0) {
              const llmCost = calculateLLMCost(promptTokens, completionTokens, GROQ_MODEL_NAME);
              const serviceType = ServiceType.GROQ_LLM;

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
                        estimated: isEstimated,
                        animationToolUsed: animationEmitted,
                      },
                    },
                  },
                  status: 'success',
                },
              ];

              await logGenerationCost({
                userId: decoded.userId,
                source: CostSource.LEARNING_CHATBOT,
                sourceId: videoId,
                services,
                totalCost: llmCost,
              });

              console.log(`💰 [COST] Learning chatbot (${modelInfo.model}): ${promptTokens} input + ${completionTokens} output tokens = ${formatCost(llmCost)} (estimated)`);
            }
          } catch (costError) {
            console.error('⚠️ [CHATBOT] Failed to log cost (non-critical):', costError);
            // Don't fail the entire request if cost logging fails
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // 11. Log activity
    try {
      const { now, startOfDay } = resolveClientDay({ clientTimestamp, timezoneOffsetMinutes });
      await ActivityLog.create({
        userId: decoded.userId,
        activityType: 'chatbot_message_sent',
        sourceId: videoId,
        date: startOfDay,
        timestamp: now,
        metadata: {
          messageLength: message.length,
          remainingMessages: rateLimit.remaining - 1,
          animationToolEnabled: ANIMATION_TOOL_ENABLED,
          ...(timeZone ? { clientTimeZone: timeZone } : {}),
          ...(typeof timezoneOffsetMinutes === 'number' ? { clientTimezoneOffsetMinutes: timezoneOffsetMinutes } : {}),
        },
      });
    } catch (logError) {
      console.error('Failed to log chatbot activity:', logError);
    }

    // 12. Return streaming response
    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
      },
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
