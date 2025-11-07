import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { groq } from '@/lib/sdk';
import { checkChatbotRateLimit } from '@/lib/rate-limit-chatbot';
import { AI_GUIDE_SYSTEM_PROMPT } from '@/lib/prompts';
import { LearningMaterial, Solution } from '@/lib/models';

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
      (p) => p.id === problemId
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

    // 7. Build AI Guide system prompt with context
    const systemPrompt = AI_GUIDE_SYSTEM_PROMPT({
      userProfile: { firstName: decoded.firstName },
      problemTitle: problem.title,
      problemScenario: problem.scenario,
      videoSummary: learningMaterial.videoSummary || 'No video summary available.',
      solutionDraft: incomingDraft ?? existingSolution?.content ?? '',
    });

    // 8. Prepare conversation history (last 4 exchanges = 8 messages)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-8),
      { role: 'user', content: message }
    ];

    // 9. Call Groq with streaming
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.8, // Slightly higher for more varied guidance
      max_tokens: 1024,
      stream: true,
    });

    // 10. Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
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
