// Unified SDK initialization with LangChain (Provider-Agnostic)
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import Groq from 'groq-sdk';

/**
 * Model constants
 */
// Validate environment variables only when accessing the models, not at import time
const getModels = () => {
  if (!process.env.CONTENT_GENERATION_MODEL) {
    if (typeof window === 'undefined') {
       console.warn('⚠️ CONTENT_GENERATION_MODEL environment variable is not set. Defaulting to gemini-1.5-pro for build/dev.');
    }
    return { gemini: 'gemini-1.5-pro', groq: 'mixtral-8x7b-32768' };
  }
  return {
    gemini: process.env.CONTENT_GENERATION_MODEL,
    groq: process.env.CHATBOT_MODEL || 'mixtral-8x7b-32768'
  };
}

export const GEMINI_MODEL_NAME = getModels().gemini;
export const GROQ_MODEL_NAME = getModels().groq;

// Lazy initialization wrapper
let _geminiLlm: ChatGoogleGenerativeAI | null = null;
let _groqLlm: ChatGroq | null = null;
let _groq: Groq | null = null;

export const getGeminiLlm = () => {
  if (!_geminiLlm) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY/GOOGLE_API_KEY is not set. Gemini calls will fail.');
    }
    
    console.log(`🔌 [SDK] Initializing Google Gemini provider with model: ${GEMINI_MODEL_NAME}`);
    _geminiLlm = new ChatGoogleGenerativeAI({
      model: GEMINI_MODEL_NAME,
      apiKey: apiKey || 'dummy-key-for-build',
      temperature: 0.7,
      streamUsage: true,
      maxRetries: 3, // Retry transient errors
    });
  }
  return _geminiLlm;
};

export const getGroqLlm = () => {
  if (!_groqLlm) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GROQ_API_KEY is not set. Groq calls will fail.');
    }

    console.log(`🔌 [SDK] Initializing Groq provider with model: ${GROQ_MODEL_NAME}`);
    _groqLlm = new ChatGroq({
      model: GROQ_MODEL_NAME,
      apiKey: apiKey || 'dummy-key-for-build',
      temperature: 0.7,
    });
  }
  return _groqLlm;
};

// Proxy exports to maintain compatibility with existing usages
export const geminiLlm = new Proxy({} as ChatGoogleGenerativeAI, {
  get: (_target, prop) => {
    const instance = getGeminiLlm();
    // @ts-expect-error -- Safe proxy binding
    return typeof instance[prop] === 'function' ? instance[prop].bind(instance) : instance[prop];
  }
});

export const groqLlm = new Proxy({} as ChatGroq, {
  get: (_target, prop) => {
    const instance = getGroqLlm();
    // @ts-expect-error -- Safe proxy binding
    return typeof instance[prop] === 'function' ? instance[prop].bind(instance) : instance[prop];
  }
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
export const groq = new Proxy({} as Groq, {
    get: (_target, prop) => {
        if (!_groq) {
            _groq = new Groq({
                apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build',
            });
        }
        // @ts-expect-error -- Safe proxy binding
        return typeof _groq[prop] === 'function' ? _groq[prop].bind(_groq) : _groq[prop];
    }
});
