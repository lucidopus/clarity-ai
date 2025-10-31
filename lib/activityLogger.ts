export type ActivityType = 'flashcard_viewed' | 'quiz_completed' | 'materials_viewed' | 'flashcard_mastered';

export async function logActivity(activityType: ActivityType, videoId?: string, metadata?: object): Promise<boolean> {
  try {
    const res = await fetch('/api/activity/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityType, videoId, metadata }),
    });
    if (res.ok) {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('activity:logged', { detail: { activityType, videoId } });
        window.dispatchEvent(event);
      }
      return true;
    }
  } catch {
    // Best-effort, ignore failures in UI path
  }
  return false;
}
