import { GoogleGenerativeAI, TaskType, GenerativeModel } from "@google/generative-ai";

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

/**
 * Normalizes a vector to unit length (L2 Norm).
 * Required for MRL embeddings (dimensions < 3072).
 */
const normalize = (vec: number[]) => {
  const norm = Math.sqrt(vec.reduce((acc, val) => acc + val * val, 0));
  return vec.map((val) => val / norm);
};

/**
 * Generates embeddings for a single string or a batch of strings.
 * Uses 'gemini-embedding-001' with 1536 dimensions.
 * Handles auto-routing to 'embedContent' or 'batchEmbedContents'.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function generateEmbeddings(input: string | string[]): Promise<number[] | number[][]> {
  try {
    if (Array.isArray(input)) {
      // BATCH MODE
      const result = await getModel().batchEmbedContents({
        requests: input.map((text) => ({
          content: { role: "user", parts: [{ text }] },
          taskType: TaskType.RETRIEVAL_DOCUMENT, // Optimize for retrieval
          outputDimensionality: EMBEDDING_DIMENSIONS,
        })),
      });
      
      // Normalize all vectors
      return result.embeddings.map((e: any) => normalize(e.values));
    } else {
      // SINGLE MODE
      const result = await getModel().embedContent({
        content: { role: "user", parts: [{ text: input as string }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      } as any);

      // Normalize single vector
      return normalize(result.embedding.values);
    }
  } catch (error) {
    console.error("Embedding Generation Error:", error);
    throw error;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
