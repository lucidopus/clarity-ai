/**
 * Scoring utilities for personality profile trait calculations
 *
 * Based on research-backed psychometric scales:
 * - Conscientiousness: 7 items from Big Five Inventory
 * - Emotional Stability: 7 items from Big Five Inventory
 * - Self-Efficacy: 3 items from General Self-Efficacy Scale
 * - Goal Orientations: 2 separate slider values (Mastery & Performance)
 *
 * All items use 1-7 Likert scale (Strongly Disagree → Strongly Agree)
 * Reverse-scored items are handled automatically
 */

/**
 * Reverse scores an item (converts 1→7, 2→6, 3→5, etc.)
 */
export function reverseScore(score: number): number {
  if (score < 1 || score > 7) {
    throw new Error('Score must be between 1 and 7');
  }
  return 8 - score;
}

/**
 * Calculates the average of an array of scores
 */
export function calculateAverage(scores: number[]): number {
  if (scores.length === 0) {
    throw new Error('Cannot calculate average of empty array');
  }
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Number((sum / scores.length).toFixed(2)); // Round to 2 decimal places
}

/**
 * Conscientiousness trait scoring (7 items)
 *
 * Items (1-7 scale):
 * 1. I make plans and stick to them
 * 2. I get distracted easily (REVERSE)
 * 3. I finish what I start
 * 4. I am organized and methodical
 * 5. I procrastinate frequently (REVERSE)
 * 6. I follow through on commitments
 * 7. I lose track of time when studying (REVERSE)
 *
 * @param responses Array of 7 responses (1-7 scale)
 * @returns Average conscientiousness score (1-7)
 */
export function scoreConscientiousness(responses: number[]): number {
  if (responses.length !== 7) {
    throw new Error('Conscientiousness requires exactly 7 responses');
  }

  // Reverse score items 2, 5, and 7 (negatively-worded items)
  const scored = [
    responses[0],           // Item 1: Direct
    reverseScore(responses[1]), // Item 2: Reverse
    responses[2],           // Item 3: Direct
    responses[3],           // Item 4: Direct
    reverseScore(responses[4]), // Item 5: Reverse
    responses[5],           // Item 6: Direct
    reverseScore(responses[6]), // Item 7: Reverse
  ];

  return calculateAverage(scored);
}

/**
 * Emotional Stability trait scoring (7 items)
 *
 * Items (1-7 scale):
 * 1. I stay calm under pressure
 * 2. I get stressed easily (REVERSE)
 * 3. I handle setbacks well
 * 4. I worry about making mistakes (REVERSE)
 * 5. I remain composed during challenges
 * 6. I feel overwhelmed by difficult tasks (REVERSE)
 * 7. I bounce back quickly from failures
 *
 * @param responses Array of 7 responses (1-7 scale)
 * @returns Average emotional stability score (1-7)
 */
export function scoreEmotionalStability(responses: number[]): number {
  if (responses.length !== 7) {
    throw new Error('Emotional Stability requires exactly 7 responses');
  }

  // Reverse score items 2, 4, and 6 (negatively-worded items)
  const scored = [
    responses[0],           // Item 1: Direct
    reverseScore(responses[1]), // Item 2: Reverse
    responses[2],           // Item 3: Direct
    reverseScore(responses[3]), // Item 4: Reverse
    responses[4],           // Item 5: Direct
    reverseScore(responses[5]), // Item 6: Reverse
    responses[6],           // Item 7: Direct
  ];

  return calculateAverage(scored);
}

/**
 * Self-Efficacy trait scoring (3 items)
 *
 * Items (1-7 scale):
 * 1. I can figure out most things if I try hard enough
 * 2. Even challenging material is learnable for me
 * 3. I believe I can master difficult concepts with effort
 *
 * @param responses Array of 3 responses (1-7 scale)
 * @returns Average self-efficacy score (1-7)
 */
export function scoreSelfEfficacy(responses: number[]): number {
  if (responses.length !== 3) {
    throw new Error('Self-Efficacy requires exactly 3 responses');
  }

  // All items are positively worded (no reverse scoring needed)
  return calculateAverage(responses);
}

/**
 * Validates that all scores are within the valid 1-7 range
 */
export function validateScores(scores: number[]): boolean {
  return scores.every(score => score >= 1 && score <= 7);
}

/**
 * Computes complete personality profile from onboarding responses
 *
 * @param conscientiousnessResponses 7 responses for conscientiousness items
 * @param emotionalStabilityResponses 7 responses for emotional stability items
 * @param selfEfficacyResponses 3 responses for self-efficacy items
 * @param masteryOrientation Single slider value (1-7)
 * @param performanceOrientation Single slider value (1-7)
 * @returns Complete personality profile object
 */
export function computePersonalityProfile(
  conscientiousnessResponses: number[],
  emotionalStabilityResponses: number[],
  selfEfficacyResponses: number[],
  masteryOrientation: number,
  performanceOrientation: number
) {
  // Validate all inputs
  if (!validateScores(conscientiousnessResponses)) {
    throw new Error('Conscientiousness responses must be between 1 and 7');
  }
  if (!validateScores(emotionalStabilityResponses)) {
    throw new Error('Emotional stability responses must be between 1 and 7');
  }
  if (!validateScores(selfEfficacyResponses)) {
    throw new Error('Self-efficacy responses must be between 1 and 7');
  }
  if (masteryOrientation < 1 || masteryOrientation > 7) {
    throw new Error('Mastery orientation must be between 1 and 7');
  }
  if (performanceOrientation < 1 || performanceOrientation > 7) {
    throw new Error('Performance orientation must be between 1 and 7');
  }

  return {
    conscientiousness: scoreConscientiousness(conscientiousnessResponses),
    emotionalStability: scoreEmotionalStability(emotionalStabilityResponses),
    selfEfficacy: scoreSelfEfficacy(selfEfficacyResponses),
    masteryOrientation: Number(masteryOrientation.toFixed(2)),
    performanceOrientation: Number(performanceOrientation.toFixed(2)),
  };
}
