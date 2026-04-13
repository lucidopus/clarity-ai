import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { Flashcard, ActivityLog, Progress, Video } from '@/lib/models';
import FlashcardReview from '@/lib/models/FlashcardReview';
import mongoose from 'mongoose';

interface NarrativeResult {
  narrative: string;
  category: 'streak' | 'retention' | 'mastery' | 'consistency' | 'growth' | 'welcome';
}

interface UserData {
  streak: number;
  challenges: string[];
  goals: string[];
  role: string | null;
}

interface ActivityData {
  hasStudiedToday: boolean;
  totalTopics: number;
  totalFlashcards: number;
  averageRetention: number | null;
  averageQuizScore: number | null;
  dueCards: number;
}

type NarrativeRule = {
  challenge?: string;
  goal?: string;
  condition: (user: UserData, activity: ActivityData) => boolean;
  category: NarrativeResult['category'];
  templates: ((user: UserData, activity: ActivityData) => string)[];
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Narrative rules ordered by impact. First matching rule wins.
 * Each rule optionally ties to a challenge/goal for prioritization.
 */
const NARRATIVE_RULES: NarrativeRule[] = [
  // ── Challenge: staying-motivated ──
  {
    challenge: 'staying-motivated',
    condition: (u) => u.streak >= 3,
    category: 'streak',
    templates: [
      (u) => `${u.streak}-day streak — you said staying motivated was tough. Look at you go.`,
      (u) => `${u.streak} days in a row. The motivation you were looking for? It's showing up.`,
    ],
  },
  {
    challenge: 'staying-motivated',
    condition: (_, a) => a.hasStudiedToday,
    category: 'consistency',
    templates: [
      () => `You showed up today. That's the hardest part, and you already did it.`,
    ],
  },

  // ── Challenge: retention ──
  {
    challenge: 'retention',
    condition: (_, a) => a.averageRetention !== null && a.averageRetention >= 70,
    category: 'retention',
    templates: [
      (_, a) => `${a.averageRetention}% retention rate — your memory is working for you now.`,
      (_, a) => `You're remembering ${a.averageRetention}% of what you study. Retention was a worry — not anymore.`,
    ],
  },
  {
    challenge: 'retention',
    condition: (_, a) => a.averageRetention !== null && a.averageRetention > 0,
    category: 'retention',
    templates: [
      (_, a) => `${a.averageRetention}% retention and climbing. Each review makes it stronger.`,
    ],
  },

  // ── Challenge: information-overload ──
  {
    challenge: 'information-overload',
    condition: (_, a) => a.totalTopics >= 3,
    category: 'mastery',
    templates: [
      (_, a) => `You've organized ${a.totalTopics} topics into your knowledge map. The overwhelm is becoming clarity.`,
      (_, a) => `${a.totalTopics} topics structured and tracked — no more information chaos.`,
    ],
  },

  // ── Challenge: time-management ──
  {
    challenge: 'time-management',
    condition: (_, a) => a.hasStudiedToday,
    category: 'consistency',
    templates: [
      () => `You found the time today. That's the win.`,
      () => `Fitting in a session when time is tight — that's real discipline.`,
    ],
  },

  // ── Challenge: lack-of-structure ──
  {
    challenge: 'lack-of-structure',
    condition: (_, a) => a.totalTopics >= 2,
    category: 'growth',
    templates: [
      (_, a) => `${a.totalTopics} topics organized, ${a.totalFlashcards} flashcards built. Structure is forming.`,
    ],
  },

  // ── Challenge: procrastination ──
  {
    challenge: 'procrastination',
    condition: (_, a) => a.hasStudiedToday,
    category: 'consistency',
    templates: [
      () => `You didn't put it off — you showed up. That's everything.`,
    ],
  },

  // ── Goal: career-change ──
  {
    goal: 'career-change',
    condition: (_, a) => a.totalTopics >= 2,
    category: 'growth',
    templates: [
      (_, a) => `You've covered ${a.totalTopics} topics since starting your career change. The new skills are building.`,
    ],
  },

  // ── Goal: exam-prep ──
  {
    goal: 'exam-prep',
    condition: (_, a) => a.averageQuizScore !== null && a.averageQuizScore > 0,
    category: 'mastery',
    templates: [
      (_, a) => `Your quiz average is ${a.averageQuizScore}% — exam day is looking good.`,
    ],
  },

  // ── Goal: skill-building ──
  {
    goal: 'skill-building',
    condition: (_, a) => a.totalFlashcards >= 10,
    category: 'growth',
    templates: [
      (_, a) => `${a.totalFlashcards} flashcards across ${a.totalTopics} topics. The skills are compounding.`,
    ],
  },

  // ── Generic streak (no specific challenge) ──
  {
    condition: (u) => u.streak >= 7,
    category: 'streak',
    templates: [
      (u) => `${u.streak} days strong. Consistency like that changes outcomes.`,
    ],
  },
  {
    condition: (u) => u.streak >= 3,
    category: 'streak',
    templates: [
      (u) => `${u.streak}-day streak — momentum is building.`,
    ],
  },

  // ── Generic activity ──
  {
    condition: (_, a) => a.totalFlashcards >= 5,
    category: 'growth',
    templates: [
      (_, a) => `${a.totalFlashcards} flashcards in your library and growing. Each one is future-you saying thanks.`,
    ],
  },
  {
    condition: (_, a) => a.hasStudiedToday,
    category: 'consistency',
    templates: [
      () => `Already making progress today — keep the momentum going.`,
    ],
  },
];

const WELCOME_NARRATIVES: NarrativeResult = {
  narrative: 'Generate your first materials to start tracking your progress here.',
  category: 'welcome',
};

export async function generateProgressNarrative(userId: string): Promise<NarrativeResult> {
  await dbConnect();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [user, totalFlashcards, dueCards, totalTopics, todayActivity, retentionAgg, progresses] = await Promise.all([
    User.findById(userId)
      .select('studyStreak preferences.learning.learningChallenges preferences.learning.learningGoals preferences.learning.role')
      .lean() as Promise<{
        studyStreak?: number;
        preferences?: {
          learning?: {
            learningChallenges?: string[];
            learningGoals?: string[];
            role?: string;
          };
        };
      } | null>,
    Flashcard.countDocuments({ userId }),
    Flashcard.countDocuments({ userId, 'fsrs.due': { $lte: now } }),
    Video.countDocuments({ userId, processingStatus: 'completed' }),
    ActivityLog.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: todayStart },
      activityType: { $in: ['flashcard_viewed', 'quiz_completed', 'flashcard_mastered'] },
    }),
    // Aggregate retention on the DB side instead of fetching all review docs
    FlashcardReview.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), reviewedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: 1 }, good: { $sum: { $cond: [{ $gte: ['$rating', 3] }, 1, 0] } } } },
    ]) as Promise<{ total: number; good: number }[]>,
    Progress.find({ userId }).lean(),
  ]);

  // No content yet — welcome state
  if (totalFlashcards === 0 && totalTopics === 0) {
    return WELCOME_NARRATIVES;
  }

  const retentionData = retentionAgg[0];
  const averageRetention = retentionData && retentionData.total > 0
    ? Math.round((retentionData.good / retentionData.total) * 100)
    : null;

  let totalQuizAttempts = 0;
  let totalQuizScore = 0;
  for (const p of progresses) {
    for (const a of (p.quizAttempts || [])) {
      totalQuizAttempts++;
      totalQuizScore += a.score || 0;
    }
  }
  const averageQuizScore = totalQuizAttempts > 0 ? Math.round(totalQuizScore / totalQuizAttempts) : null;

  const userData: UserData = {
    streak: user?.studyStreak ?? 0,
    challenges: user?.preferences?.learning?.learningChallenges ?? [],
    goals: user?.preferences?.learning?.learningGoals ?? [],
    role: user?.preferences?.learning?.role ?? null,
  };

  const activityData: ActivityData = {
    hasStudiedToday: todayActivity > 0,
    totalTopics,
    totalFlashcards,
    averageRetention,
    averageQuizScore,
    dueCards,
  };

  // Priority: challenge-matched rules first, then goal-matched, then generic
  const challengeSet = new Set(userData.challenges);
  const goalSet = new Set(userData.goals);

  // 1. Try challenge-matched rules
  for (const rule of NARRATIVE_RULES) {
    if (rule.challenge && challengeSet.has(rule.challenge) && rule.condition(userData, activityData)) {
      const template = pickRandom(rule.templates);
      return { narrative: template(userData, activityData), category: rule.category };
    }
  }

  // 2. Try goal-matched rules
  for (const rule of NARRATIVE_RULES) {
    if (rule.goal && goalSet.has(rule.goal) && rule.condition(userData, activityData)) {
      const template = pickRandom(rule.templates);
      return { narrative: template(userData, activityData), category: rule.category };
    }
  }

  // 3. Try generic rules (no challenge/goal requirement)
  for (const rule of NARRATIVE_RULES) {
    if (!rule.challenge && !rule.goal && rule.condition(userData, activityData)) {
      const template = pickRandom(rule.templates);
      return { narrative: template(userData, activityData), category: rule.category };
    }
  }

  // Fallback
  return {
    narrative: 'Every session builds on the last. Keep going.',
    category: 'growth',
  };
}
