import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { parseJsonBody, isErrorResponse } from '@/lib/utils/api';
import { internalServerError } from '@/lib/errors/apiResponse';
import { checkRateLimitMongo } from '@/lib/rate-limit';
import { chatbotLlm } from '@/lib/sdk';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CLARITY_MODE } from '@/lib/limits';

const draftSchema = z.object({
  sourceTitle: z.string().max(300).optional(),
  summary: z.string().max(4_000).optional(),
  recentFocus: z.string().max(1_000).optional(),
});

const DRAFT_SYSTEM = `You draft a single short recall question a learner could answer from memory tomorrow.

Constraints:
- One question only, ${CLARITY_MODE.echo.maxQuestionChars} characters max.
- It must be answerable from the session's content, not open-ended "what do you think" fluff.
- Prefer mechanism / causal / discrimination questions over "what is X" definitions.
- No preamble, no explanation, no multiple options — just the question text.
`;

/**
 * POST /api/echo/draft — optional Clara-assisted drafting for the Echo
 * prompt. Opt-in via the "Help me phrase one" ghost button in the overlay.
 * Rate-limited to 3 calls per user per hour so it can't be spammed.
 *
 * Body is an optional bag of session signals we hand the model. We deliberately
 * keep this endpoint cheap (~100 tokens out) and short-lived — not streamed.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    const rateLimit = await checkRateLimitMongo(
      `echo-draft:${decoded.userId}`,
      CLARITY_MODE.echo.draftAssistPerSession,
      60 * 60,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Draft assist limit reached for this hour.', retryAfter: rateLimit.retryAfter },
        { status: 429 },
      );
    }

    const body = await parseJsonBody<z.infer<typeof draftSchema>>(request, 16_000);
    if (isErrorResponse(body)) return body;
    const parsed = draftSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const fragments: string[] = [];
    if (parsed.data.sourceTitle) fragments.push(`Source: ${parsed.data.sourceTitle}`);
    if (parsed.data.summary) fragments.push(`Summary: ${parsed.data.summary.slice(0, 1_200)}`);
    if (parsed.data.recentFocus) fragments.push(`Recent focus: ${parsed.data.recentFocus.slice(0, 600)}`);
    if (fragments.length === 0) {
      fragments.push('The learner did not provide session signals; draft a generic but useful self-quiz question.');
    }

    const result = await chatbotLlm.invoke([
      new SystemMessage(DRAFT_SYSTEM),
      new HumanMessage(fragments.join('\n\n')),
    ]);

    const raw = typeof result.content === 'string'
      ? result.content
      : Array.isArray(result.content)
        ? result.content
            .map((part) => (typeof part === 'string' ? part : (part as { text?: string }).text ?? ''))
            .join('')
        : '';
    // Strip surrounding whitespace / quotes; collapse internal whitespace;
    // enforce the char cap so a wobbly model can't overshoot.
    let suggested = raw.trim().replace(/^["'`\s]+|["'`\s]+$/g, '').replace(/\s+/g, ' ');
    if (suggested.length > CLARITY_MODE.echo.maxQuestionChars) {
      suggested = suggested.slice(0, CLARITY_MODE.echo.maxQuestionChars);
    }

    return NextResponse.json({ suggestedQuestion: suggested });
  } catch (error) {
    console.error('Error drafting echo:', error);
    return internalServerError();
  }
}
