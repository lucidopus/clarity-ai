import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import LearningMaterial, { IPrerequisite } from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';

export interface ChatbotContext {
  userProfile: {
    firstName: string;
    userType: 'Undergraduate' | 'Graduate';
  };
  videoSummary: string;
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

  // Fetch user profile
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Fetch learning material
  const learningMaterial = await LearningMaterial.findOne({
    userId: userId,
    videoId: videoId,
  });
  if (!learningMaterial) {
    throw new Error('Learning material not found');
  }

  // For videos processed before chatbot feature, provide fallback
  const videoSummary = learningMaterial.videoSummary || 'This video was processed before the AI chatbot feature was added. To enable full chatbot functionality, please reprocess the video.';

  // Fetch flashcard count
  const flashcardCount = await Flashcard.countDocuments({
    userId: userId,
    videoId: videoId,
  });

  // Fetch quiz count
  const quizCount = await Quiz.countDocuments({
    userId: userId,
    videoId: videoId,
  });

  return {
    userProfile: {
      firstName: user.firstName,
      userType: user.userType,
    },
    videoSummary,
    materials: {
      flashcardCount,
      quizCount,
      prerequisiteTopics: learningMaterial.prerequisites.map((p: IPrerequisite) => p.topic),
    },
  };
}