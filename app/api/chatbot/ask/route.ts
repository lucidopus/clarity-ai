import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { groq } from '@/lib/sdk';
import { getChatbotContext } from '@/lib/chatbot-context';
import { checkChatbotRateLimit } from '@/lib/rate-limit-chatbot';
import { CHATBOT_SYSTEM_PROMPT } from '@/lib/prompts';
import ActivityLog from '@/lib/models/ActivityLog';
import { saveChatMessage } from '@/lib/chat-db';
import { generateSessionId, generateMessageId } from '@/lib/types/chat';
import { resolveClientDay } from '@/lib/date.utils';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
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
    } = await request.json();
    if (!videoId || !message) {
      return NextResponse.json({ error: 'videoId and message are required' }, { status: 400 });
    }

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

    // 7. Build system prompt
    const systemPrompt = CHATBOT_SYSTEM_PROMPT(context);

    // 8. Prepare conversation history (last 3 exchanges = 6 messages)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-6),
      { role: 'user', content: message }
    ];

    // 9. Call Groq with streaming
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    // 10. Create streaming response and accumulate assistant response
    let assistantResponse = '';
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
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
              'chatbot', // channel
              videoId,   // contextId (same as videoId for chatbot channel)
              undefined  // problemId (not used for chatbot channel)
            );
          } catch (saveError) {
            console.error('Failed to save assistant message:', saveError);
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
        videoId: videoId,
        date: startOfDay,
        timestamp: now,
        metadata: {
          messageLength: message.length,
          remainingMessages: rateLimit.remaining - 1,
          ...(timeZone ? { clientTimeZone: timeZone } : {}),
          ...(typeof timezoneOffsetMinutes === 'number' ? { clientTimezoneOffsetMinutes: timezoneOffsetMinutes } : {}),
        },
      });
    } catch (logError) {
      console.error('Failed to log chatbot activity:', logError);
    }

    // 12. Return streaming response
    return new NextResponse(stream, {
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
