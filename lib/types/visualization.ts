import { z } from 'zod';

/**
 * Schemas for Clara's inline visualization primitives.
 *
 * Clara emits these as code-fenced JSON blocks (` ```callout ` / ` ```compare `).
 * The chat renderer parses + validates each block at render time and falls back
 * gracefully when the JSON is malformed. Validation is the single source of
 * truth — never trust raw output from the model.
 */

export const CALLOUT_TYPES = ['info', 'insight', 'warn'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

export const CalloutSpecSchema = z.object({
  type: z.enum(CALLOUT_TYPES),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
});
export type CalloutSpec = z.infer<typeof CalloutSpecSchema>;

// Tight bounds so two-column comparison stays scannable inside a chat bubble.
// Long items defeat the side-by-side affordance; for >6 items, prompt steers
// Clara to a markdown table instead.
const ComparisonColumnSchema = z.object({
  title: z.string().min(1).max(120),
  items: z.array(z.string().min(1).max(200)).min(1).max(6),
});

export const ComparisonSpecSchema = z.object({
  left: ComparisonColumnSchema,
  right: ComparisonColumnSchema,
});
export type ComparisonSpec = z.infer<typeof ComparisonSpecSchema>;

/**
 * Strip JSON quirks that LLMs commonly produce regardless of model:
 *   - // and /* … *​/ comments
 *   - trailing commas before } or ]
 *
 * Intentionally conservative — only the patterns we've actually seen in the
 * wild. If the LLM emits something stranger, parse will fail and the renderer
 * shows the raw fence.
 */
function sanitizeJson(str: string): string {
  return str
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1');
}

function tryParse<T>(jsonStr: string, schema: z.ZodSchema<T>): T | null {
  for (const candidate of [jsonStr, sanitizeJson(jsonStr)]) {
    try {
      const parsed = JSON.parse(candidate);
      const result = schema.safeParse(parsed);
      if (result.success) return result.data;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export function tryParseCalloutSpec(jsonStr: string): CalloutSpec | null {
  return tryParse(jsonStr, CalloutSpecSchema);
}

export function tryParseComparisonSpec(jsonStr: string): ComparisonSpec | null {
  return tryParse(jsonStr, ComparisonSpecSchema);
}
