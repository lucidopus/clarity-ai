import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import LearningMaterial, { IPrerequisite } from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import Source from '@/lib/models/Source';

export interface ChatbotContext {
  userProfile: {
    firstName: string;
    userType: string;
    learningGoals?: string[];
    learningChallenges?: string[];
    role?: string;
    personalityProfile?: {
      conscientiousness: number;
      emotionalStability: number;
      selfEfficacy: number;
      masteryOrientation: number;
      performanceOrientation: number;
    };
    preferredMaterialsRanked?: string[];
    dailyTimeMinutes?: number;
  };
  summary: string;
  sourceTitle?: string;
  sourceType?: string;
  materials: {
    flashcardCount: number;
    quizCount: number;
    prerequisiteTopics: string[];
  };
}

export async function getChatbotContext(
  userId: string,
  videoId: string
): Promise<ChatbotContext> {
  await dbConnect();

  // Fetch user profile, learning material, and source metadata in parallel
  const [user, learningMaterial, source, flashcardCount, quizCount] = await Promise.all([
    User.findById(userId),
    LearningMaterial.findOne({ userId, sourceId: videoId }),
    Source.findOne({ userId, sourceId: videoId }).select('title sourceType').lean(),
    Flashcard.countDocuments({ userId, sourceId: videoId }),
    Quiz.countDocuments({ userId, sourceId: videoId }),
  ]);

  if (!user) throw new Error('User not found');
  if (!learningMaterial) throw new Error('Learning material not found');

  const summary = learningMaterial.summary || 'This source was processed before the AI chatbot feature was added. To enable full chatbot functionality, please reprocess it.';

  const sourceDoc = source as { title?: string; sourceType?: string } | null;

  const learning = user.preferences?.learning;

  return {
    userProfile: {
      firstName: user.firstName,
      userType: user.userType,
      ...(learning?.learningGoals?.length && { learningGoals: learning.learningGoals }),
      ...(learning?.learningChallenges?.length && { learningChallenges: learning.learningChallenges }),
      ...(learning?.role && { role: learning.role }),
      ...(learning?.personalityProfile && { personalityProfile: learning.personalityProfile }),
      ...(learning?.preferredMaterialsRanked?.length && { preferredMaterialsRanked: learning.preferredMaterialsRanked }),
      ...(learning?.dailyTimeMinutes != null && { dailyTimeMinutes: learning.dailyTimeMinutes }),
    },
    summary,
    sourceTitle: sourceDoc?.title,
    sourceType: sourceDoc?.sourceType,
    materials: {
      flashcardCount,
      quizCount,
      prerequisiteTopics: learningMaterial.prerequisites.map((p: IPrerequisite) => p.topic),
    },
  };
}