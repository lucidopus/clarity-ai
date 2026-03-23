/**
 * Shared tool-calling infrastructure for Clara's agentic capabilities.
 *
 * Provides utilities for intercepting tool calls during streaming.
 * Used by the animation tool and future tools (image gen, etc).
 */

import type { AIMessageChunk } from '@langchain/core/messages';

export interface ToolCallResult {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Extract completed tool calls from a stream of AIMessageChunks.
 *
 * LangChain streams tool calls progressively via `tool_call_chunks`.
 * This accumulator merges chunks by index and returns complete tool calls
 * once the stream is done.
 */
export class ToolCallAccumulator {
  private partials: Map<number, { name: string; argsJson: string }> = new Map();

  /** Feed a chunk into the accumulator. */
  addChunk(chunk: AIMessageChunk): void {
    const toolCallChunks = chunk.tool_call_chunks;
    if (!toolCallChunks?.length) return;

    for (const tc of toolCallChunks) {
      const idx = tc.index ?? 0;
      const existing = this.partials.get(idx);

      if (existing) {
        existing.argsJson += tc.args ?? '';
      } else {
        this.partials.set(idx, {
          name: tc.name ?? '',
          argsJson: tc.args ?? '',
        });
      }
    }
  }

  /** Returns all accumulated tool calls. Call after stream ends. */
  getToolCalls(): ToolCallResult[] {
    const results: ToolCallResult[] = [];

    for (const [, partial] of this.partials) {
      if (!partial.name) continue;

      try {
        const args = JSON.parse(partial.argsJson);
        results.push({ name: partial.name, args });
      } catch {
        console.warn(`[TOOLS] Failed to parse tool call args for "${partial.name}"`);
      }
    }

    return results;
  }

  /** Check if any tool calls are being accumulated. */
  hasToolCalls(): boolean {
    return this.partials.size > 0;
  }

  /** Reset the accumulator. */
  reset(): void {
    this.partials.clear();
  }
}
