// Unified SDK initialization with LangChain (Provider-Agnostic)
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * The active LLM instance used throughout the application.
 * To switch providers, simply change this export to a different ChatModel instance.
 *
 * Examples:
 * - Groq: new ChatGroq({ model: 'openai/gpt-oss-120b', apiKey: process.env.GROQ_API_KEY })
 * - Gemini: new ChatGoogleGenerativeAI({ model: 'gemini-1.5-pro', apiKey: process.env.GEMINI_API_KEY })
 */
export const llm: BaseChatModel = new ChatGroq({
  model: 'openai/gpt-oss-120b',
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
});

/**
 * Legacy Groq SDK (kept for backward compatibility during migration)
 * @deprecated Use `llm` instead for new code
 */
import Groq from 'groq-sdk';
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// To switch to Gemini, uncomment this and comment out the Groq llm above:
// export const llm: BaseChatModel = new ChatGoogleGenerativeAI({
//   model: 'gemini-1.5-pro',
//   apiKey: process.env.GEMINI_API_KEY,
//   temperature: 0.7,
// });
