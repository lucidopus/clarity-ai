/**
 * Brier score computation for quiz confidence calibration.
 * Lower score = better calibrated (0 is perfect).
 */

const CONFIDENCE_NORMALIZED: Record<number, number> = {
  1: 0.33, // Guessing
  2: 0.66, // Somewhat Sure
  3: 1.0,  // Confident
};

export interface CalibrationInput {
  confidenceRating: number; // 1 | 2 | 3
  isCorrect: boolean;
}

export function computeBrierScore(results: CalibrationInput[]): number {
  if (results.length === 0) return 0;

  const sum = results.reduce((acc, { confidenceRating, isCorrect }) => {
    const normalized = CONFIDENCE_NORMALIZED[confidenceRating] ?? 0.5;
    const correct = isCorrect ? 1 : 0;
    return acc + Math.pow(normalized - correct, 2);
  }, 0);

  return Math.round((sum / results.length) * 100) / 100;
}

export function getCalibrationLabel(score: number): string {
  if (score <= 0.1) return 'Excellent';
  if (score <= 0.2) return 'Good';
  if (score <= 0.35) return 'Fair';
  return 'Needs Work';
}
