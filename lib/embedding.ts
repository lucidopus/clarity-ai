import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

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
export async function generateEmbeddings(input: string | string[]): Promise<number[] | number[][]> {
  try {
    if (Array.isArray(input)) {
      // BATCH MODE
      const result = await model.batchEmbedContents({
        requests: input.map((text) => ({
          content: { role: "user", parts: [{ text }] },
          taskType: TaskType.RETRIEVAL_DOCUMENT, // Optimize for retrieval
          outputDimensionality: EMBEDDING_DIMENSIONS,
        } as any)),
      });
      
      // Normalize all vectors
      return result.embeddings.map((e) => normalize(e.values));
    } else {
      // SINGLE MODE
      const result = await model.embedContent({
        content: { role: "user", parts: [{ text: input }] },
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
