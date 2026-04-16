import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { chatbotLlm, CHATBOT_MODEL_NAME } from '@/lib/sdk';
import { getChatbotContext } from '@/lib/chatbot-context';
import { checkChatbotRateLimit } from '@/lib/rate-limit';
import { CHATBOT_SYSTEM_PROMPT, ANIMATION_TOOL_PROMPT_ADDENDUM, VISUALIZE_COMMAND_ADDENDUM } from '@/lib/prompts';
import ActivityLog from '@/lib/models/ActivityLog';
import { saveChatMessage } from '@/lib/chat-db';
import { generateSessionId, generateMessageId } from '@/lib/types/chat';
import { parseJsonBody, isErrorResponse } from '@/lib/utils/api';
import { resolveClientDay } from '@/lib/date.utils';
import { calculateLLMCost, getCurrentModelInfo } from '@/lib/cost/calculator';
import { logGenerationCost, formatCost } from '@/lib/cost/logger';
import { CostSource, ServiceType } from '@/lib/models/Cost';
import type { IServiceUsage } from '@/lib/models/Cost';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import type { AIMessageChunk } from '@langchain/core/messages';
import { ToolCallAccumulator } from '@/lib/tools';
import { renderAnimationTool } from '@/lib/tools/render-animation';
import { createClaraTools, TOOL_LABELS } from '@/lib/tools/clara-tools';
import { INPUT_LIMITS } from '@/lib/limits';
import { AnimationSpecSchema } from '@/lib/types/animation';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

const ANIMATION_TOOL_ENABLED = process.env.ENABLE_ANIMATION_TOOL === 'true';

interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Send a single SSE event to the stream controller. */
function emitSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: Record<string, unknown>,
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

/**
 * Execute a Clara tool by name, returning the string result.
 */
async function executeTool(
  toolName: string,
  toolArgs: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any[],
): Promise<string> {
  const matchedTool = tools.find((t: { name: string }) => t.name === toolName);
  if (!matchedTool) return `Tool "${toolName}" not found.`;

  const start = Date.now();
  try {
    const result = await matchedTool.invoke(toolArgs ?? {});
    console.log(`⚡ [CLARA] Tool "${toolName}" completed in ${Date.now() - start}ms | ${(typeof result === 'string' ? result.length : JSON.stringify(result).length)} chars`);
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (err) {
    console.error(`[CHATBOT] Tool "${toolName}" failed after ${Date.now() - start}ms:`, err);
    return `Tool "${toolName}" encountered an error.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const decoded = getAuthUser(request);

    // 2. Parse request (capped at 512KB to prevent DoS via large payloads)
    const bodyOrError = await parseJsonBody<{
      videoId?: string;
      activeSourceId?: string;
      message?: string;
      conversationHistory?: IChatMessage[];
      clientTimestamp?: string;
      timezoneOffsetMinutes?: number;
      timeZone?: string;
      forceVisualize?: boolean;
    }>(request, 512_000);
    if (isErrorResponse(bodyOrError)) return bodyOrError;
    const {
      videoId,
      activeSourceId,
      message,
      conversationHistory,
      clientTimestamp,
      timezoneOffsetMinutes,
      timeZone,
      forceVisualize,
    } = bodyOrError;
    if (!videoId || !message) {
      return NextResponse.json({ error: 'videoId and message are required' }, { status: 400 });
    }

    if (typeof message !== 'string' || message.length > INPUT_LIMITS.chatMessageLength) {
      return NextResponse.json({ error: `Message must be a string under ${INPUT_LIMITS.chatMessageLength} characters` }, { status: 400 });
    }

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
    const sessionId = generateSessionId(decoded.userId, videoId);
    const userMessageId = generateMessageId('user');
    const assistantMessageId = generateMessageId('assistant');

    const xffHeader = request.headers.get('x-forwarded-for');
    const clientIp = xffHeader ? xffHeader.split(',').map(s => s.trim()).pop() : (request.headers.get('x-real-ip') || undefined);

    // 5. Save user message to database
    try {
      await saveChatMessage(
        sessionId, userMessageId, 'user', message,
        decoded.userId, videoId, clientIp,
        'chatbot', videoId, undefined,
      );
    } catch (saveError) {
      console.error('Failed to save user message:', saveError);
    }

    // 6. Fetch context
    const context = await getChatbotContext(decoded.userId, videoId);

    // 7. Build system prompt
    let systemPrompt = CHATBOT_SYSTEM_PROMPT(context);
    if (useAnimationTool) {
      systemPrompt += ANIMATION_TOOL_PROMPT_ADDENDUM;
      if (forceVisualize) {
        systemPrompt += VISUALIZE_COMMAND_ADDENDUM;
      }
    }

    // 8. Bind tools to model — Clara's lookup tool + optional animation tool
    const claraTools = createClaraTools(decoded.userId, videoId, activeSourceId);
    const allTools = useAnimationTool
      ? [...claraTools, renderAnimationTool]
      : claraTools;

    const model = chatbotLlm.bindTools(allTools);

    // 9. Prepare messages
    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...(conversationHistory || []).slice(-6)
        .filter((msg: IChatMessage) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: IChatMessage) => {
          if (msg.role === 'user') return new HumanMessage(msg.content);
          return new AIMessage(msg.content);
        }),
      new HumanMessage(message),
    ];

    // 10. Stream response — simple bindTools pattern (at most 2 LLM calls)
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let assistantResponse = '';
    let animationEmitted = false;
    const toolsUsed: string[] = [];

    const tokenCallback = {
      handleLLMEnd: (output: { llmOutput?: { tokenUsage?: { promptTokens?: number; completionTokens?: number } } }) => {
        const tokenUsage = output.llmOutput?.tokenUsage;
        if (tokenUsage) {
          totalPromptTokens += tokenUsage.promptTokens || 0;
          totalCompletionTokens += tokenUsage.completionTokens || 0;
        }
      },
    };

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // 60s timeout to prevent hung LLM connections from holding resources indefinitely
        const abortController = new AbortController();
        const streamTimeout = setTimeout(() => abortController.abort(), 60000);

        try {
          const requestStart = Date.now();
          console.log(`🤖 [CLARA] Streaming | model: ${CHATBOT_MODEL_NAME} | user: ${decoded.userId} | source: ${videoId}`);

          // ── First LLM call: stream text or detect tool calls ──
          const toolAccumulator = new ToolCallAccumulator();
          let firstCallText = '';

          const stream = await model.stream(langchainMessages, { callbacks: [tokenCallback], signal: abortController.signal });

          for await (const chunk of stream) {
            const aiChunk = chunk as AIMessageChunk;
            const content = aiChunk.content as string;

            toolAccumulator.addChunk(aiChunk);

            if (content) {
              firstCallText += content;
              // Stream text tokens directly when no tool calls are accumulating
              if (!toolAccumulator.hasToolCalls()) {
                emitSSE(controller, encoder, { type: 'token', content });
              }
            }
          }

          console.log(`⏱️ [CLARA] First call done in ${Date.now() - requestStart}ms | text: ${firstCallText.length} chars | tools: ${toolAccumulator.hasToolCalls()}`);

          // ── Handle tool calls (if any) ──
          if (toolAccumulator.hasToolCalls()) {
            const toolCalls = toolAccumulator.getToolCalls();

            // Separate animation tool calls from data-lookup tool calls
            const lookupCalls = toolCalls.filter(tc => tc.name !== 'render_animation');
            const animationCall = toolCalls.find(tc => tc.name === 'render_animation');

            // Handle animation tool — append code block directly (no second LLM call needed)
            if (animationCall) {
              const parsed = AnimationSpecSchema.safeParse(animationCall.args);
              if (parsed.success) {
                const animationBlock = `\n\n\`\`\`animation\n${JSON.stringify(parsed.data)}\n\`\`\``;
                firstCallText += animationBlock;
                emitSSE(controller, encoder, { type: 'token', content: animationBlock });
                animationEmitted = true;
              } else {
                console.warn('[CHATBOT] Invalid AnimationSpec from LLM:', parsed.error.message);
                const fallbackNote = '\n\n> *Animation could not be generated for this explanation.*';
                firstCallText += fallbackNote;
                emitSSE(controller, encoder, { type: 'token', content: fallbackNote });
              }
              toolsUsed.push('render_animation');
            }

            // Handle data-lookup tools — execute, then make second LLM call for the answer
            if (lookupCalls.length > 0) {
              const lookupCallsForHistory = lookupCalls.map((tc, i) => ({
                id: `call_${i}`,
                name: tc.name,
                args: tc.args,
              }));

              // Emit tool_start per source
              for (const tc of lookupCallsForHistory) {
                if (tc.name === 'lookup_study_materials') {
                  const sources = ((tc.args as { sources?: string[] })?.sources) || [];
                  console.log(`🔧 [CLARA] lookup_study_materials: [${sources.join(', ')}]`);
                  for (const src of sources) {
                    toolsUsed.push(src);
                    emitSSE(controller, encoder, {
                      type: 'tool_start',
                      tool: src,
                      label: TOOL_LABELS[src] || `Fetching ${src}`,
                    });
                  }
                }
              }

              // Execute lookup tools in parallel
              const toolExecStart = Date.now();
              const toolResults = await Promise.all(
                lookupCallsForHistory.map(async (tc) => {
                  const result = await executeTool(tc.name, tc.args as Record<string, unknown>, claraTools);
                  return { id: tc.id, name: tc.name, result };
                }),
              );
              console.log(`⚡ [CLARA] Tools executed in ${Date.now() - toolExecStart}ms`);

              // Build conversation with tool results for the second LLM call
              const messagesWithTools: BaseMessage[] = [
                ...langchainMessages,
                new AIMessage({ content: firstCallText, tool_calls: lookupCallsForHistory }),
              ];

              for (const { id, name, result } of toolResults) {
                messagesWithTools.push(new ToolMessage({ content: result, tool_call_id: id, name }));

                // Emit tool_end per source
                if (name === 'lookup_study_materials') {
                  const tc = lookupCallsForHistory.find(t => t.name === 'lookup_study_materials');
                  const sources = ((tc?.args as { sources?: string[] })?.sources) || [];
                  for (const src of sources) {
                    emitSSE(controller, encoder, { type: 'tool_end', tool: src });
                  }
                }
              }

              // ── Second LLM call: stream the final answer ──
              const secondStart = Date.now();
              const answerStream = await model.stream(messagesWithTools, { callbacks: [tokenCallback], signal: abortController.signal });

              for await (const chunk of answerStream) {
                const content = (chunk as AIMessageChunk).content as string;
                if (content) {
                  assistantResponse += content;
                  emitSSE(controller, encoder, { type: 'token', content });
                }
              }

              console.log(`⏱️ [CLARA] Second call (answer) done in ${Date.now() - secondStart}ms | ${assistantResponse.length} chars`);
            } else {
              // Animation-only — first call text + animation block is the full response
              assistantResponse = firstCallText;
            }
          } else {
            // No tool calls — text was already streamed directly
            assistantResponse = firstCallText;
          }

          console.log(`🏁 [CLARA] Complete | tools: [${toolsUsed.join(', ')}] | total: ${Date.now() - requestStart}ms`);

          emitSSE(controller, encoder, { type: 'done' });
          controller.close();

          // ── Post-stream: save message, log activity, log cost ──

          try {
            await saveChatMessage(
              sessionId, assistantMessageId, 'assistant', assistantResponse,
              decoded.userId, videoId, clientIp,
              'chatbot', videoId, undefined,
            );
          } catch (saveError) {
            console.error('Failed to save assistant message:', saveError);
          }

          if (animationEmitted) {
            try {
              const { now, startOfDay } = resolveClientDay({ clientTimestamp, timezoneOffsetMinutes });
              await ActivityLog.create({
                userId: decoded.userId,
                activityType: 'animation_rendered',
                sourceId: videoId,
                date: startOfDay,
                timestamp: now,
                metadata: { source: 'tool_call' },
              });
            } catch (logError) {
              console.error('Failed to log animation activity:', logError);
            }
          }

          try {
            const modelInfo = getCurrentModelInfo(CHATBOT_MODEL_NAME);
            let isEstimated = false;

            if (totalPromptTokens === 0 && totalCompletionTokens === 0) {
              totalPromptTokens = Math.ceil(message.length / 4);
              totalCompletionTokens = Math.ceil(assistantResponse.length / 4);
              isEstimated = true;
              console.warn('⚠️ [CHATBOT] Using token estimation (LangChain callback did not provide usage)');
            }

            if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
              const llmCost = calculateLLMCost(totalPromptTokens, totalCompletionTokens, CHATBOT_MODEL_NAME);
              const llmCalls = toolsUsed.length > 0 ? 2 : 1;

              const services: IServiceUsage[] = [{
                service: ServiceType.GEMINI_LLM,
                usage: {
                  cost: llmCost,
                  unitDetails: {
                    inputTokens: totalPromptTokens,
                    outputTokens: totalCompletionTokens,
                    totalTokens: totalPromptTokens + totalCompletionTokens,
                    metadata: {
                      model: modelInfo.model,
                      messageLength: message.length,
                      responseLength: assistantResponse.length,
                      estimated: isEstimated,
                      animationToolUsed: animationEmitted,
                      toolsUsed,
                      llmCalls,
                    },
                  },
                },
                status: 'success',
              }];

              await logGenerationCost({
                userId: decoded.userId,
                source: CostSource.LEARNING_CHATBOT,
                sourceId: videoId,
                services,
                totalCost: llmCost,
              });

              console.log(`💰 [COST] Chatbot (${modelInfo.model}): ${totalPromptTokens} in + ${totalCompletionTokens} out = ${formatCost(llmCost)}`);
            }
          } catch (costError) {
            console.error('⚠️ [CHATBOT] Failed to log cost (non-critical):', costError);
          }
        } catch (error) {
          const isAbort = error instanceof Error && error.name === 'AbortError';
          console.error('[CHATBOT] Stream error:', isAbort ? 'Timed out after 60s' : error);
          try {
            emitSSE(controller, encoder, {
              type: 'error',
              message: isAbort ? 'Response timed out. Please try again.' : 'Something went wrong. Please try again.',
            });
          } catch { /* stream may already be closed */ }
          controller.close();
        } finally {
          clearTimeout(streamTimeout);
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

    // 12. Return SSE streaming response
    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
      },
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    return apiErrorResponse('CHAT_UNAVAILABLE', 500);
  }
}
