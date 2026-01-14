export const CHATBOT_NAME = 'Clara';

export const VIDEO_CATEGORIES = [
  'Science & Engineering',
  'Technology & Coding',
  'Business & Finance',
  'Productivity & Self-Improvement',
  'Health & Fitness',
  'History & Society',
  'Arts & Design',
  'Philosophy & Religion',
  'Language & Communication',
  'Lifestyle & How-To',
  'News & Current Events',
  'Other',
] as const;

export const RECOMMENDATION_CONSTANTS = {
  VECTOR_INDEX_NAME: 'vector_index',
  CANDIDATE_LIMIT: 150,
  VECTOR_SEARCH_CANDIDATES: 1000, // Number of nearest neighbors to examine (numCandidates/efSearch)
  CACHE_TTL_SECONDS: 60 * 60 * 24, // 24 hours
};