/**
 * Unit Tests for hooks/useActivityTracker.ts
 *
 * Tests inactivity detection, activity reset, and timer cleanup.
 * Uses @testing-library/react for hook testing.
 *
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useActivityTracker } from './useActivityTracker';

// Use fake timers for testing timeout behavior
jest.useFakeTimers();

describe('useActivityTracker', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  test('starts with isInactive=false', () => {
    const { result } = renderHook(() => useActivityTracker());

    expect(result.current.isInactive).toBe(false);
  });

  test('becomes inactive after inactivityThreshold', () => {
    const { result } = renderHook(() =>
      useActivityTracker({ inactivityThreshold: 5000 })
    );

    expect(result.current.isInactive).toBe(false);

    // Fast-forward past the inactivity threshold
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isInactive).toBe(true);
  });

  test('respects custom inactivityThreshold', () => {
    const { result } = renderHook(() =>
      useActivityTracker({ inactivityThreshold: 10000 })
    );

    // After 5s (half the threshold), should still be active
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.isInactive).toBe(false);

    // After another 5s (total 10s), should be inactive
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.isInactive).toBe(true);
  });

  test('resetActivity resets inactivity timer', () => {
    const { result } = renderHook(() =>
      useActivityTracker({ inactivityThreshold: 5000 })
    );

    // Advance time but not enough to trigger inactivity
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current.isInactive).toBe(false);

    // Reset activity
    act(() => {
      result.current.resetActivity();
    });

    // Advance time again - should still be active since we reset
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current.isInactive).toBe(false);

    // Advance past threshold from reset point - now inactive
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.isInactive).toBe(true);
  });

  test('resetActivity sets isInactive to false if already inactive', () => {
    const { result } = renderHook(() =>
      useActivityTracker({ inactivityThreshold: 1000 })
    );

    // Become inactive
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.isInactive).toBe(true);

    // Reset activity
    act(() => {
      result.current.resetActivity();
    });
    expect(result.current.isInactive).toBe(false);
  });

  test('lastActivity updates on reset', () => {
    const initialTime = Date.now();
    const { result } = renderHook(() => useActivityTracker());

    const initialLastActivity = result.current.lastActivity;
    expect(initialLastActivity).toBeGreaterThanOrEqual(initialTime);

    // Advance time and reset
    jest.advanceTimersByTime(2000);

    act(() => {
      result.current.resetActivity();
    });

    expect(result.current.lastActivity).toBeGreaterThan(initialLastActivity);
  });
});
