// Unified SDK initialization for Phase 5
import Groq from 'groq-sdk';

// Initialize Groq client
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Export other SDKs here as they're added
// This makes it easy to switch providers later

