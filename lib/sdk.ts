// Unified SDK initialization with LangChain (Provider-Agnostic)
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * The active LLM instance used throughout the application.
 * Automatically selects the provider based on the LLM_MODEL environment variable.
 */
const modelName = process.env.LLM_MODEL || 'gemini-2.0-flash'; // Default to Gemini if not set

let llmInstance: BaseChatModel;

if (modelName.includes('gemini') || modelName.includes('google')) {
  console.log(`🔌 [SDK] Initializing Google Gemini provider with model: ${modelName}`);
  llmInstance = new ChatGoogleGenerativeAI({
    model: modelName,
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
    streamUsage: true, // REQUIRED for accurate token tracking during streaming
  });
} else {
  console.log(`🔌 [SDK] Initializing Groq provider with model: ${modelName}`);
  llmInstance = new ChatGroq({
    model: modelName,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7,
  });
}

export const llm = llmInstance;

/**
 * Legacy Groq SDK (kept for backward compatibility during migration)
 * @deprecated Use `llm` instead for new code
 */
import Groq from 'groq-sdk';
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// To switch back to Groq, uncomment the ChatGroq export above and comment out the Gemini one.
