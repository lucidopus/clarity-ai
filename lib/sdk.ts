// Unified SDK initialization with LangChain (Provider-Agnostic)
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

/**
 * Model constants
 */
// Validate environment variables
if (!process.env.CONTENT_GENERATION_MODEL) {
  throw new Error('❌ CONTENT_GENERATION_MODEL environment variable is not set. Please set it in .env.local (e.g., gemini-3-pro-preview).');
}
if (!process.env.CHATBOT_MODEL) {
  throw new Error('❌ CHATBOT_MODEL environment variable is not set. Please set it in .env.local (e.g., openai/gpt-oss-120b).');
}

// Use CONTENT_GENERATION_MODEL for Gemini
export const GEMINI_MODEL_NAME = process.env.CONTENT_GENERATION_MODEL;

// Use CHATBOT_MODEL for Groq
export const GROQ_MODEL_NAME = process.env.CHATBOT_MODEL;

console.log(`🔌 [SDK] Initializing Google Gemini provider with model: ${GEMINI_MODEL_NAME}`);
export const geminiLlm = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL_NAME,
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7,
  streamUsage: true, // REQUIRED for accurate token tracking during streaming
});

console.log(`🔌 [SDK] Initializing Groq provider with model: ${GROQ_MODEL_NAME}`);
export const groqLlm = new ChatGroq({
  model: GROQ_MODEL_NAME,
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
});

/**
 * The active LLM instance used throughout the application.
 * Defaults to Gemini for backward compatibility.
 */
export const llm = geminiLlm;

/**
 * Legacy Groq SDK (kept for backward compatibility during migration)
 * @deprecated Use `llm` (or specific `groqLlm`) instead for new code
 */
import Groq from 'groq-sdk';
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
