/**
 * Unit Tests for lib/utils/scoring.ts
 *
 * Tests personality trait scoring logic including reverse scoring and validation.
 */

import {
  reverseScore,
  calculateAverage,
  scoreConscientiousness,
  scoreEmotionalStability,
  scoreSelfEfficacy,
  validateScores,
  computePersonalityProfile,
} from './scoring';

describe('Scoring Utilities', () => {
  describe('reverseScore', () => {
    test('correctly reverses scores 1-7', () => {
      expect(reverseScore(1)).toBe(7);
      expect(reverseScore(2)).toBe(6);
      expect(reverseScore(3)).toBe(5);
      expect(reverseScore(4)).toBe(4);
      expect(reverseScore(5)).toBe(3);
      expect(reverseScore(6)).toBe(2);
      expect(reverseScore(7)).toBe(1);
    });

    test('throws error for invalid scores', () => {
      expect(() => reverseScore(0)).toThrow();
      expect(() => reverseScore(8)).toThrow();
    });
  });

  describe('calculateAverage', () => {
    test('calculates correct average', () => {
      expect(calculateAverage([1, 2, 3])).toBe(2);
      expect(calculateAverage([2, 2, 2])).toBe(2);
      expect(calculateAverage([1, 7])).toBe(4);
    });

    test('rounds to 2 decimal places', () => {
      // 10 / 3 = 3.3333...
      expect(calculateAverage([3, 3, 4])).toBe(3.33);
    });

    test('throws error for empty array', () => {
      expect(() => calculateAverage([])).toThrow();
    });
  });

  describe('Trait Scoring', () => {
    test('scoreConscientiousness handles reverse scored items', () => {
      // Items 2, 5, 7 are reverse scored
      // If user inputs all 7s:
      // Direct (1,3,4,6) = 7
      // Reverse (2,5,7) = 1
      // Sum = 7+1+7+7+1+7+1 = 31
      // Avg = 31/7 = 4.43
      const allSevens = [7, 7, 7, 7, 7, 7, 7];
      expect(scoreConscientiousness(allSevens)).toBe(4.43);
      
      // If user inputs ideal conscientious profile (High on direct, Low on reverse)
      // Input: [7, 1, 7, 7, 1, 7, 1]
      // Scored: [7, 7, 7, 7, 7, 7, 7] => Avg 7
      const perfectScore = [7, 1, 7, 7, 1, 7, 1];
      expect(scoreConscientiousness(perfectScore)).toBe(7);
    });

    test('scoreEmotionalStability handles reverse scored items', () => {
      // Items 2, 4, 6 are reverse scored
      // Input perfect stable profile: [7, 1, 7, 1, 7, 1, 7]
      // Scored: [7, 7, 7, 7, 7, 7, 7] => Avg 7
      const perfectScore = [7, 1, 7, 1, 7, 1, 7];
      expect(scoreEmotionalStability(perfectScore)).toBe(7);
    });

    test('scoreSelfEfficacy calculates simple average', () => {
      expect(scoreSelfEfficacy([5, 6, 7])).toBe(6);
    });

    test('validates input length', () => {
      expect(() => scoreConscientiousness([1, 2, 3])).toThrow();
      expect(() => scoreEmotionalStability([1, 2, 3])).toThrow();
      expect(() => scoreSelfEfficacy([1, 2])).toThrow();
    });
  });

  describe('Validation', () => {
    test('validateScores checks range 1-7', () => {
      expect(validateScores([1, 7, 4])).toBe(true);
      expect(validateScores([0, 7])).toBe(false);
      expect(validateScores([1, 8])).toBe(false);
    });
  });

  describe('computePersonalityProfile', () => {
    test('computes full profile correctly', () => {
      const result = computePersonalityProfile(
        [7, 1, 7, 7, 1, 7, 1], // Conscientiousness (Perfect = 7)
        [7, 1, 7, 1, 7, 1, 7], // Stability (Perfect = 7)
        [7, 7, 7],             // Self-Efficacy (Perfect = 7)
        7,                     // Mastery
        5                      // Performance
      );

      expect(result).toEqual({
        conscientiousness: 7,
        emotionalStability: 7,
        selfEfficacy: 7,
        masteryOrientation: 7,
        performanceOrientation: 5,
      });
    });

    test('throws on invalid inputs', () => {
       expect(() => computePersonalityProfile(
        [8, 1, 7, 7, 1, 7, 1], // Invalid score 8
        [7, 1, 7, 1, 7, 1, 7],
        [7, 7, 7],
        7,
        5
      )).toThrow();
    });
  });
});
