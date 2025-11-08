import { useState, useEffect, useCallback, useRef } from 'react';

interface UseActivityTrackerOptions {
  inactivityThreshold?: number; // milliseconds
  debounceMs?: number;
}

interface UseActivityTrackerReturn {
  isInactive: boolean;
  inactiveDuration: number;
  lastActivity: number;
  resetActivity: () => void;
}

export function useActivityTracker(options: UseActivityTrackerOptions = {}): UseActivityTrackerReturn {
  const { inactivityThreshold = 15000, debounceMs = 100 } = options;

  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [isInactive, setIsInactive] = useState(false);
  const [inactiveDuration, setInactiveDuration] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    setIsInactive(false);

    // Clear existing inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set new inactivity timer
    inactivityTimerRef.current = setTimeout(() => {
      setIsInactive(true);
    }, inactivityThreshold);
  }, [inactivityThreshold]);

  const handleActivity = useCallback(() => {
    // Debounce activity events
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      resetActivity();
    }, debounceMs);
  }, [resetActivity, debounceMs]);

  useEffect(() => {
    // Activity events to monitor
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'focus',
      'click'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize activity tracking
    resetActivity();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [handleActivity, resetActivity]);

  // Update inactive duration whenever lastActivity changes
  useEffect(() => {
    setInactiveDuration(Date.now() - lastActivity);
  }, [lastActivity]);

  return {
    isInactive,
    inactiveDuration,
    lastActivity,
    resetActivity
  };
}