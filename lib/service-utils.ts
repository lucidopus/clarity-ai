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
