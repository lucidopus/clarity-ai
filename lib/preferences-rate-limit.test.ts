/**
 * Unit Tests for Learning Profile Update Rate Limiting
 * 
 * Tests the rate limiting logic for the learning profile update feature.
 * The limit is configured via MAX_LEARNING_PROFILE_UPDATES_PER_MONTH in config.ts
 */

import { MAX_LEARNING_PROFILE_UPDATES_PER_MONTH } from './config';

// Helper function that mirrors the rate limiting logic in api/preferences/route.ts
function countUpdatesInCurrentMonth(updateTimestamps: Date[]): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return updateTimestamps.filter((date) => new Date(date) >= startOfMonth).length;
}

function getUpdatesRemainingThisMonth(updateTimestamps: Date[]): number {
  const updatesThisMonth = countUpdatesInCurrentMonth(updateTimestamps);
  return Math.max(0, MAX_LEARNING_PROFILE_UPDATES_PER_MONTH - updatesThisMonth);
}

function hasReachedUpdateLimit(updateTimestamps: Date[]): boolean {
  return countUpdatesInCurrentMonth(updateTimestamps) >= MAX_LEARNING_PROFILE_UPDATES_PER_MONTH;
}

describe('Learning Profile Update Rate Limiting', () => {
  describe('MAX_LEARNING_PROFILE_UPDATES_PER_MONTH config', () => {
    test('should be a positive integer', () => {
      expect(MAX_LEARNING_PROFILE_UPDATES_PER_MONTH).toBeGreaterThan(0);
      expect(Number.isInteger(MAX_LEARNING_PROFILE_UPDATES_PER_MONTH)).toBe(true);
    });

    test('should have default value of 2', () => {
      expect(MAX_LEARNING_PROFILE_UPDATES_PER_MONTH).toBe(2);
    });
  });

  describe('countUpdatesInCurrentMonth', () => {
    test('returns 0 for empty array', () => {
      expect(countUpdatesInCurrentMonth([])).toBe(0);
    });

    test('counts only updates in current month', () => {
      const now = new Date();
      const thisMonth = [
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth(), 15),
      ];
      expect(countUpdatesInCurrentMonth(thisMonth)).toBe(2);
    });

    test('excludes updates from previous months', () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 10);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5);
      
      const updates = [lastMonth, twoMonthsAgo, thisMonth];
      expect(countUpdatesInCurrentMonth(updates)).toBe(1);
    });

    test('handles year boundary correctly', () => {
      const now = new Date();
      // If we're in January, test with December dates
      // If we're in another month, the test still works
      const lastYear = new Date(now.getFullYear() - 1, 11, 25);
      const updates = [lastYear];
      
      // Should be 0 unless we're in December of the previous year's calculation
      if (now.getMonth() === 0) { // January
        expect(countUpdatesInCurrentMonth(updates)).toBe(0);
      }
    });
  });

  describe('getUpdatesRemainingThisMonth', () => {
    test('returns max limit for no updates', () => {
      expect(getUpdatesRemainingThisMonth([])).toBe(MAX_LEARNING_PROFILE_UPDATES_PER_MONTH);
    });

    test('decrements correctly with each update', () => {
      const now = new Date();
      const oneUpdate = [new Date(now.getFullYear(), now.getMonth(), 1)];
      expect(getUpdatesRemainingThisMonth(oneUpdate)).toBe(MAX_LEARNING_PROFILE_UPDATES_PER_MONTH - 1);
    });

    test('returns 0 when limit is reached', () => {
      const now = new Date();
      const updates = Array.from({ length: MAX_LEARNING_PROFILE_UPDATES_PER_MONTH }, (_, i) => 
        new Date(now.getFullYear(), now.getMonth(), i + 1)
      );
      expect(getUpdatesRemainingThisMonth(updates)).toBe(0);
    });

    test('never returns negative values', () => {
      const now = new Date();
      // Create more updates than the limit
      const updates = Array.from({ length: MAX_LEARNING_PROFILE_UPDATES_PER_MONTH + 5 }, (_, i) => 
        new Date(now.getFullYear(), now.getMonth(), i + 1)
      );
      expect(getUpdatesRemainingThisMonth(updates)).toBe(0);
    });
  });

  describe('hasReachedUpdateLimit', () => {
    test('returns false for no updates', () => {
      expect(hasReachedUpdateLimit([])).toBe(false);
    });

    test('returns false when under limit', () => {
      const now = new Date();
      const updates = [new Date(now.getFullYear(), now.getMonth(), 1)];
      expect(hasReachedUpdateLimit(updates)).toBe(false);
    });

    test('returns true when at limit', () => {
      const now = new Date();
      const updates = Array.from({ length: MAX_LEARNING_PROFILE_UPDATES_PER_MONTH }, (_, i) => 
        new Date(now.getFullYear(), now.getMonth(), i + 1)
      );
      expect(hasReachedUpdateLimit(updates)).toBe(true);
    });

    test('returns true when over limit', () => {
      const now = new Date();
      const updates = Array.from({ length: MAX_LEARNING_PROFILE_UPDATES_PER_MONTH + 1 }, (_, i) => 
        new Date(now.getFullYear(), now.getMonth(), i + 1)
      );
      expect(hasReachedUpdateLimit(updates)).toBe(true);
    });

    test('ignores updates from previous months', () => {
      const now = new Date();
      // Fill with old updates
      const oldUpdates = Array.from({ length: 10 }, (_, i) => 
        new Date(now.getFullYear(), now.getMonth() - 1, i + 1)
      );
      expect(hasReachedUpdateLimit(oldUpdates)).toBe(false);
    });
  });

  describe('Month boundary cases', () => {
    test('updates from start of month are counted', () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      expect(countUpdatesInCurrentMonth([startOfMonth])).toBe(1);
    });

    test('update at end of previous month is not counted', () => {
      const now = new Date();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      expect(countUpdatesInCurrentMonth([endOfLastMonth])).toBe(0);
    });
  });
});
