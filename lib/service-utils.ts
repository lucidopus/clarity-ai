/**
 * Centralized service categorization and metadata utilities
 *
 * This module provides a single source of truth for mapping service IDs
 * to human-readable labels and UI metadata. All cost analytics components
 * should import from this file to ensure consistency.
 *
 * Matching Strategy (3-tier):
 * 1. Exact Match: Check specific overrides first (e.g., learning_chatbot)
 * 2. Pattern Match: Check regex patterns (e.g., /_llm$/ for LLM services)
 * 3. Fallback: Format raw service ID as title case
 */

/**
 * Service category configuration
 * Defines patterns and labels for different service types
 */
interface ServicePattern {
  id: string;
  label: string;
  pattern: RegExp;
  icon: 'llm' | 'transcript' | 'video' | 'chat' | 'dollar';
}

/**
 * Exact match overrides for specific service IDs
 * Use this for operations or services that don't follow patterns
 */
const EXACT_MATCHES: Record<string, { label: string; icon: 'llm' | 'transcript' | 'video' | 'chat' | 'dollar' }> = {
  learning_material_generation: { label: 'Video Processing', icon: 'video' },
  learning_chatbot: { label: 'Learning Chatbot', icon: 'chat' },
  challenge_chatbot: { label: 'Challenge Chatbot', icon: 'chat' },
};

/**
 * Pattern-based service categories
 * Services matching these patterns will be grouped under the same label
 *
 * To add new service category:
 * 1. Add entry to this array with pattern and label
 * 2. Add corresponding icon type if needed
 * 3. All components will automatically use the new category
 */
const SERVICE_PATTERNS: ServicePattern[] = [
  {
    id: 'llm',
    label: 'Large Language Model (LLM)',
    pattern: /_llm$/i, // Matches: groq_llm, gemini_llm, openai_llm, etc.
    icon: 'llm',
  },
  {
    id: 'transcript',
    label: 'Transcript Extraction',
    pattern: /transcript/i, // Matches: apify_transcript, youtube_transcript, etc.
    icon: 'transcript',
  },
];

/**
 * Get human-readable label for a service ID
 *
 * Uses 3-tier matching strategy:
 * 1. Check exact matches (specific overrides)
 * 2. Check pattern matches (regex-based categories)
 * 3. Fallback to formatted service ID
 *
 * @param serviceId - Raw service identifier from the database
 * @returns Human-readable service label
 *
 * @example
 * getServiceLabel('groq_llm') // Returns: 'Large Language Model (LLM)'
 * getServiceLabel('gemini_llm') // Returns: 'Large Language Model (LLM)'
 * getServiceLabel('learning_chatbot') // Returns: 'Learning Chatbot'
 * getServiceLabel('unknown_service') // Returns: 'Unknown Service'
 */
export function getServiceLabel(serviceId: string): string {
  // Tier 1: Exact match
  if (EXACT_MATCHES[serviceId]) {
    return EXACT_MATCHES[serviceId].label;
  }

  // Tier 2: Pattern match
  for (const pattern of SERVICE_PATTERNS) {
    if (pattern.pattern.test(serviceId)) {
      return pattern.label;
    }
  }

  // Tier 3: Fallback - format raw ID as title case
  return formatServiceId(serviceId);
}

/**
 * Get icon identifier for a service ID
 * Returns a string identifier that components can map to actual icon components
 *
 * @param serviceId - Raw service identifier from the database
 * @returns Icon identifier string
 *
 * @example
 * getServiceIcon('groq_llm') // Returns: 'llm'
 * getServiceIcon('apify_transcript') // Returns: 'transcript'
 */
export function getServiceIcon(serviceId: string): 'llm' | 'transcript' | 'video' | 'chat' | 'dollar' {
  // Tier 1: Exact match
  if (EXACT_MATCHES[serviceId]) {
    return EXACT_MATCHES[serviceId].icon;
  }

  // Tier 2: Pattern match
  for (const pattern of SERVICE_PATTERNS) {
    if (pattern.pattern.test(serviceId)) {
      return pattern.icon;
    }
  }

  // Tier 3: Fallback - generic dollar icon
  return 'dollar';
}

/**
 * Format raw service ID as human-readable title case
 * Helper function for fallback display
 *
 * @param serviceId - Raw service identifier (e.g., 'learning_chatbot')
 * @returns Title case string (e.g., 'Learning Chatbot')
 *
 * @example
 * formatServiceId('learning_chatbot') // Returns: 'Learning Chatbot'
 * formatServiceId('groq_llm') // Returns: 'Groq Llm'
 */
function formatServiceId(serviceId: string): string {
  return serviceId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get all unique service categories from a list of service IDs
 * Useful for grouping/aggregating services by category
 *
 * @param serviceIds - Array of raw service identifiers
 * @returns Array of unique category labels
 *
 * @example
 * getServiceCategories(['groq_llm', 'gemini_llm', 'apify_transcript'])
 * // Returns: ['Large Language Model (LLM)', 'Transcript Extraction']
 */
export function getServiceCategories(serviceIds: string[]): string[] {
  const categories = new Set<string>();
  for (const serviceId of serviceIds) {
    categories.add(getServiceLabel(serviceId));
  }
  return Array.from(categories);
}

// ----------------------------------------------------------------------
// RECOMMENDATION ENGINE UTILITIES
// ----------------------------------------------------------------------

import { ILearningPreferences } from '@/lib/models/User';

/**
 * Helper to map 1-7 scale scores to descriptive semantic phrases.
 */
const describeTrait = (score: number | undefined, low: string, high: string): string => {
  if (score === undefined) return '';
  if (score >= 5) return high;
  if (score <= 3) return low;
  return ''; // Middle range (4) is "average/balanced" and doesn't need strong semantic bias
};

/**
 * Constructs a High-Fidelity User Narrative for Vector Embedding.
 * 
 * This transforms raw JSON data (including numerical personality scores) into a 
 * detailed, natural-language autobiography of the learner.
 * 
 * Structure:
 * 1. Introduction & Role (Who am I?)
 * 2. Psychometric Learning Profile (How do I learn?) - Derived from 1-7 scores
 * 3. Goals & Aspirations (What do I want?)
 * 4. Pain Points & Challenges (What is stopping me?)
 * 5. Preferred Methodology (What works for me?)
 * 6. Semantic Anchors (Keywords)
 */
export const constructUserProfileString = (prefs: Partial<ILearningPreferences>): string => {
  const parts: string[] = [];
  
  // --- SECTION 1: IDENTITY ---
  if (prefs.role) {
    parts.push(`I am a ${prefs.role}.`);
  }

  // --- SECTION 2: PSYCHOMETRIC PROFILE (The "How I Learn" Narrative) ---
  const traits: string[] = [];
  
  if (prefs.personalityProfile) {
    const p = prefs.personalityProfile;
    
    // Conscientiousness: Structure vs Flexibility
    traits.push(describeTrait(p.conscientiousness, 
      "I prefer flexible, spontaneous exploration over rigid plans.", 
      "I am highly disciplined, organized, and prefer structured, step-by-step learning paths."
    ));

    // Emotional Stability: Resilience vs Support Need
    traits.push(describeTrait(p.emotionalStability, 
      "I prefer supportive, encouraging content that breaks down complex topics to reduce anxiety.", 
      "I am resilient and eager to tackle difficult, complex, and stressful challenges."
    ));

    // Self Efficacy: Confidence
    traits.push(describeTrait(p.selfEfficacy, 
      "I benefit from guided instruction, foundational reviews, and confidence-building exercises.", 
      "I am a confident self-starter who prefers to jump straight into advanced material."
    ));

    // Mastery Orientation: Depth vs Breadth/Speed
    traits.push(describeTrait(p.masteryOrientation, 
      "I prefer practical, quick summaries over deep theoretical dives.",
      "My primary motivation is deep, fundamental understanding and mastery of the subject matter."
    ));

    // Performance Orientation: Grades/Competition vs Growth
    traits.push(describeTrait(p.performanceOrientation, 
      "I am motivated by personal growth and curiosity rather than external validation.", 
      "I am driven by achievements, test scores, competition, and benchmarking my skills against others."
    ));
  }

  // Filter out empty strings from "middle" scores and join
  const personalityNarrative = traits.filter(t => t.length > 0).join(' ');
  if (personalityNarrative) {
    parts.push(personalityNarrative);
  }

  // --- SECTION 3: GOALS (The "What" Positive) ---
  if (prefs.learningGoalText) {
    parts.push(`My specific goal is to: ${prefs.learningGoalText}.`);
  }
  
  if (prefs.learningGoals && prefs.learningGoals.length > 0) {
    parts.push(`I am actively looking to acquire knowledge in: ${prefs.learningGoals.join(', ')}.`);
  }

  // --- SECTION 4: CHALLENGES (The "What" Negative) ---
  // Problem-solution matching: phrases like "struggling with" align with "solution to" vectors.
  if (prefs.learningChallengesText) {
    parts.push(`However, I am currently struggling with: ${prefs.learningChallengesText}.`);
  }

  if (prefs.learningChallenges && prefs.learningChallenges.length > 0) {
    parts.push(`I face specific technical hurdles with: ${prefs.learningChallenges.join(', ')}.`);
  }

  // --- SECTION 5: METHODOLOGY ---
  if (prefs.preferredMaterialsRanked && prefs.preferredMaterialsRanked.length > 0) {
    parts.push(`I learn best when the content is presented as: ${prefs.preferredMaterialsRanked.join(', ')}.`);
  }

  // Time Availability Context - Helps in recommending shorter vs longer videos
  if (prefs.dailyTimeMinutes) {
    if (prefs.dailyTimeMinutes <= 15) {
      parts.push("I have very limited time (under 15 mins) efficiently.");
    } else if (prefs.dailyTimeMinutes <= 30) {
      parts.push("I prefer concise sessions around 30 minutes.");
    } else if (prefs.dailyTimeMinutes >= 60) {
      parts.push("I have ample time for deep-dive sessions over an hour.");
    }
  }
  
  // --- SECTION 6: SEMANTIC ANCHORS ---
  // A raw bag-of-words dump at the end ensures that even if the narrative drift occurs, 
  // the core topic keywords are present for high-density matching.
  const keyTerms = [
    ...(prefs.learningGoals || []), 
    ...(prefs.learningChallenges || [])
  ].filter(Boolean).join(' ');
  
  if (keyTerms) {
    parts.push(`Keywords: ${keyTerms}.`);
  }

  return parts.join(' ');
};
