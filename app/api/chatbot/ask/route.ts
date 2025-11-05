import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { groq } from '@/lib/sdk';
import { getChatbotContext } from '@/lib/chatbot-context';
import { checkChatbotRateLimit } from '@/lib/rate-limit-chatbot';
import ActivityLog from '@/lib/models/ActivityLog';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
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
    const { videoId, message, conversationHistory } = await request.json();
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

    // 4. Fetch context
    const context = await getChatbotContext(decoded.userId, videoId);

    // 5. Build system prompt
    const systemPrompt = `You are an AI tutor helping a ${context.userProfile.userType} student named ${context.userProfile.firstName} learn from this video.

Video Summary: ${context.videoSummary}

Available Materials:
- ${context.materials.flashcardCount} flashcards
- ${context.materials.quizCount} quizzes
- Prerequisites: ${context.materials.prerequisiteTopics.join(', ')}

Instructions:
- Answer questions based on the video content and summary
- Be helpful, encouraging, and educational
- If asked about prerequisites, explain them clearly with examples and context
- Keep responses well-structured and scannable

FORMATTING GUIDELINES (CRITICAL):
1. **Structure your responses hierarchically**:
   - Use headings (## or ###) to organize major sections
   - Break long explanations into clear sections with descriptive headings
   - Example: "## What is Algorithmic Thinking", "## Why it matters", "## Quick Exercise"

2. **Use lists effectively**:
   - Use bullet points (- ) for related items or features
   - Use numbered lists (1. 2. 3.) for sequential steps or ordered concepts
   - Keep list items concise (1-2 lines each)
   - Add blank lines between list items for better readability when items are complex

3. **Format code properly**:
   - Use inline code for short snippets: \`variable\`, \`function()\`, \`O(n)\`
   - Use code blocks with language tags for multi-line code:
     \`\`\`python
     for i in range(n):
         print(i)
     \`\`\`
   - Always specify the language (python, javascript, java, etc.)

4. **Emphasis and clarity**:
   - Use **bold** for key terms and important concepts
   - Use *italic* for emphasis or introducing new terminology
   - Use > blockquotes for important notes or tips

5. **Spacing and readability**:
   - Add blank lines between sections (after headings, between paragraphs, around code blocks)
   - Keep paragraphs short (2-4 sentences max)
   - Use horizontal rules (---) to separate major sections if needed

6. **Examples and exercises**:
   - When explaining concepts, always include concrete examples
   - Format exercises with clear numbered steps
   - Provide answers in a separate section or collapsible format

Example of well-formatted response:

## Prerequisite: Algorithmic Thinking

**Algorithmic thinking** is the mental habit of solving problems by breaking them down into clear, step-by-step procedures that a computer could follow.

### What it involves

1. **Understanding the problem** – Identify inputs, outputs, and constraints
2. **Decomposing into sub-tasks** – Break complex problems into manageable pieces
3. **Choosing data structures** – Select the right tools (arrays, lists, hash tables)
4. **Designing procedures** – Write clear pseudocode detailing operations
5. **Analyzing complexity** – Count operations to measure efficiency

### Why it matters for Big O

It helps you translate problem statements into concrete procedures, which is the foundation for complexity analysis. Good algorithmic thinking makes it easier to *identify dominant operations* and *ignore constants*.

### Quick Exercise

Try this problem: *"Find the maximum number in an unsorted list"*

1. Write a one-sentence algorithm description
2. Write pseudocode
3. Count basic operations as a function of list length \`n\`

**Answer:**

\`\`\`python
max_value = array[0]
for i in range(1, len(array)):
    if array[i] > max_value:
        max_value = array[i]
\`\`\`

The comparison runs *n-1* times → **O(n)**.

---

Remember: Always prioritize **clarity** and **scannability** over density. Your goal is to help students learn, not overwhelm them with walls of text.`;

    // 6. Prepare conversation history (last 3 exchanges = 6 messages)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-6),
      { role: 'user', content: message }
    ];

    // 7. Call Groq with streaming
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    // 8. Create streaming response
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
          controller.error(error);
        }
      },
    });

    // 9. Log activity
    try {
      const now = new Date();
      await ActivityLog.create({
        userId: decoded.userId,
        activityType: 'chatbot_message_sent',
        videoId: videoId,
        date: startOfDay(now),
        timestamp: now,
        metadata: {
          messageLength: message.length,
          remainingMessages: rateLimit.remaining - 1,
        },
      });
    } catch (logError) {
      console.error('Failed to log chatbot activity:', logError);
    }

    // 10. Return streaming response
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