import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Flashcard from '@/lib/models/Flashcard';
import ActivityLog from '@/lib/models/ActivityLog';

interface GreetingContext {
  selfEfficacy: number | null;
  streak: number;
  dueCards: number;
  hasStudiedToday: boolean;
  role: string | null;
}

interface GreetingResult {
  text: string;
  tone: 'encouraging' | 'challenging' | 'neutral' | 'celebratory';
}

type GreetingTemplate = {
  condition: (ctx: GreetingContext) => boolean;
  tone: GreetingResult['tone'];
  templates: string[];
};

/**
 * Ordered greeting rules — first match wins.
 * Templates use {streak}, {dueCards}, {role} placeholders.
 */
const GREETING_RULES: GreetingTemplate[] = [
  // Streak celebrations (high-impact moments)
  {
    condition: (ctx) => ctx.streak >= 30,
    tone: 'celebratory',
    templates: [
      '{streak} days straight. That\'s not luck — that\'s who you are now.',
      '{streak}-day streak. Most people never get here.',
    ],
  },
  {
    condition: (ctx) => ctx.streak >= 7,
    tone: 'celebratory',
    templates: [
      '{streak} days in a row — the momentum is real.',
      'A whole week and counting. {streak} days strong.',
    ],
  },

  // Already studied today — acknowledge it
  {
    condition: (ctx) => ctx.hasStudiedToday && ctx.dueCards === 0,
    tone: 'celebratory',
    templates: [
      'All caught up. Nothing due, nothing pending — enjoy the clarity.',
      'Zero cards due. You\'ve earned a breather.',
    ],
  },
  {
    condition: (ctx) => ctx.hasStudiedToday,
    tone: 'neutral',
    templates: [
      'You\'ve already put in the work today. {dueCards} cards left if you want to keep going.',
      'Good progress today. {dueCards} more cards whenever you\'re ready.',
    ],
  },

  // Cards due — nudge based on self-efficacy
  {
    condition: (ctx) => ctx.dueCards > 0 && ctx.selfEfficacy !== null && ctx.selfEfficacy <= 3,
    tone: 'encouraging',
    templates: [
      '{dueCards} cards are waiting — even a quick 5-minute session counts.',
      'Small steps add up. {dueCards} cards ready whenever you are.',
      'No rush — {dueCards} cards at your own pace.',
    ],
  },
  {
    condition: (ctx) => ctx.dueCards > 0 && ctx.selfEfficacy !== null && ctx.selfEfficacy >= 5,
    tone: 'challenging',
    templates: [
      '{dueCards} cards due. Let\'s see how fast you can clear them.',
      '{dueCards} cards on deck — time to sharpen up.',
    ],
  },
  {
    condition: (ctx) => ctx.dueCards > 0,
    tone: 'neutral',
    templates: [
      '{dueCards} cards are due for review today.',
      'You\'ve got {dueCards} cards to review — a good place to start.',
    ],
  },

  // Fallback — no cards due, nothing done today
  {
    condition: () => true,
    tone: 'neutral',
    templates: [
      'Ready when you are.',
      'What are you learning today?',
    ],
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function renderTemplate(template: string, ctx: GreetingContext): string {
  return template
    .replace(/\{streak\}/g, String(ctx.streak))
    .replace(/\{dueCards\}/g, String(ctx.dueCards))
    .replace(/\{role\}/g, ctx.role || 'learner');
}

export async function generateClaraGreeting(userId: string): Promise<GreetingResult> {
  await dbConnect();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [user, dueCards, todayActivity] = await Promise.all([
    User.findById(userId)
      .select('studyStreak preferences.learning.personalityProfile.selfEfficacy preferences.learning.role')
      .lean() as Promise<{
        studyStreak?: number;
        preferences?: {
          learning?: {
            role?: string;
            personalityProfile?: { selfEfficacy?: number };
          };
        };
      } | null>,
    Flashcard.countDocuments({ userId, 'fsrs.due': { $lte: now } }),
    ActivityLog.countDocuments({
      userId,
      date: { $gte: todayStart },
      activityType: { $in: ['flashcard_viewed', 'quiz_completed', 'flashcard_mastered'] },
    }),
  ]);

  const ctx: GreetingContext = {
    selfEfficacy: user?.preferences?.learning?.personalityProfile?.selfEfficacy ?? null,
    streak: user?.studyStreak ?? 0,
    dueCards,
    hasStudiedToday: todayActivity > 0,
    role: user?.preferences?.learning?.role ?? null,
  };

  for (const rule of GREETING_RULES) {
    if (rule.condition(ctx)) {
      const template = pickRandom(rule.templates);
      return {
        text: renderTemplate(template, ctx),
        tone: rule.tone,
      };
    }
  }

  // Should never reach here due to the catch-all rule
  return { text: 'Ready when you are.', tone: 'neutral' };
}
