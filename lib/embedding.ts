import { GoogleGenerativeAI, TaskType, GenerativeModel } from "@google/generative-ai";
import { GEMINI_EMBEDDING_COST_PER_MILLION } from "@/lib/cost/config";

let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!model) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  }
  return model;
}

const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_MODEL_NAME = 'gemini-embedding-001';

export interface EmbeddingUsage {
  inputTokens: number;
  estimated: boolean; // true when tokenCount was missing from the API response
}

export interface EmbeddingsWithUsage {
  vectors: number[] | number[][];
  usage: EmbeddingUsage;
  cost: number; // USD, rounded to 6 decimals
  model: string;
}

/**
 * Normalizes a vector to unit length (L2 Norm).
 * Required for MRL embeddings (dimensions < 3072).
 */
const normalize = (vec: number[]) => {
  const norm = Math.sqrt(vec.reduce((acc, val) => acc + val * val, 0));
  return vec.map((val) => val / norm);
};

/** ~4 chars per token is the industry-standard fallback when a provider
 *  omits tokenCount from an embedding response. */
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Embeddings API — returns vectors, token usage, and computed cost.
 * All call sites must use this so embedding spend surfaces in the cost dashboard.
 */
export async function generateEmbeddingsWithUsage(
  input: string | string[],
): Promise<EmbeddingsWithUsage> {
  try {
    let vectors: number[] | number[][];
    let inputTokens = 0;
    let estimated = false;

    if (Array.isArray(input)) {
      const result = await getModel().batchEmbedContents({
        requests: input.map((text) => ({
          content: { role: "user", parts: [{ text }] },
          taskType: TaskType.RETRIEVAL_DOCUMENT,
          outputDimensionality: EMBEDDING_DIMENSIONS,
        })),
      });

      vectors = result.embeddings.map((e: any) => normalize(e.values));

      // batchEmbedContents response has no per-request token count.
      // Estimate from inputs.
      inputTokens = input.reduce((sum, t) => sum + estimateTokens(t), 0);
      estimated = true;
    } else {
      const result: any = await getModel().embedContent({
        content: { role: "user", parts: [{ text: input as string }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      } as any);

      vectors = normalize(result.embedding.values);

      // Gemini sometimes returns usageMetadata.totalTokenCount on embedContent.
      const reported = result?.usageMetadata?.totalTokenCount
        ?? result?.embedding?.metadata?.totalTokenCount;
      if (typeof reported === 'number' && reported > 0) {
        inputTokens = reported;
      } else {
        inputTokens = estimateTokens(input as string);
        estimated = true;
      }
    }

    const cost = Math.round((inputTokens / 1_000_000) * GEMINI_EMBEDDING_COST_PER_MILLION * 1_000_000) / 1_000_000;

    return {
      vectors,
      usage: { inputTokens, estimated },
      cost,
      model: EMBEDDING_MODEL_NAME,
    };
  } catch (error) {
    console.error("Embedding Generation Error:", error);
    throw error;
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
