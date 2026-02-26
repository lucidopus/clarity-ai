export type ActivityType = 'flashcard_viewed' | 'quiz_completed' | 'materials_viewed' | 'flashcard_mastered' | 'flashcard_created' | 'video_generated' | 'email_verification_sent' | 'email_verification_success' | 'email_verification_failed' | 'email_verification_resent';

export async function logActivity(activityType: ActivityType, videoId?: string, metadata?: object): Promise<boolean> {
  try {
    const now = new Date();
    const timezoneOffsetMinutes = now.getTimezoneOffset();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const res = await fetch('/api/activity/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityType,
        videoId,
        metadata,
        clientTimestamp: now.toISOString(),
        timezoneOffsetMinutes,
        timeZone,
      }),
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
