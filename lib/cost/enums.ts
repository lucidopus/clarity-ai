/**
 * Plain TypeScript enums for cost tracking. Lives outside lib/models/Cost.ts
 * so client bundles (admin dashboard widgets) can import the enum values
 * without dragging mongoose into the browser.
 */

export enum ServiceType {
  GROQ_LLM = 'groq_llm',
  GEMINI_LLM = 'gemini_llm',
  APIFY_TRANSCRIPT = 'apify_transcript',
  CONTENT_VALIDATION = 'content_validation',
  GROQ_WHISPER = 'groq_whisper',
  GROQ_TTS = 'groq_tts',
  GEMINI_VISION = 'gemini_vision',
  GEMINI_EMBEDDING = 'gemini_embedding',
  ELEVENLABS_SCRIBE = 'elevenlabs_scribe',
  ANIMATION_TOOL = 'animation_tool',
}

export enum CostSource {
  LEARNING_MATERIAL_GENERATION = 'learning_material_generation',
  LEARNING_CHATBOT = 'learning_chatbot',
  CHALLENGE_CHATBOT = 'challenge_chatbot',
  LIVE_LECTURE_TRANSCRIPTION = 'live_lecture_transcription',
  LIVE_LECTURE_QA = 'live_lecture_qa',
}
