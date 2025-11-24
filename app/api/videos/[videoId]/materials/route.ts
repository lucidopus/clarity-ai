import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Video, { type ITranscriptSegment } from '@/lib/models/Video';
import LearningMaterial, { type IPrerequisite, type IRealWorldProblem, type IChapter } from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import { MindMap } from '@/lib/models';
import Progress from '@/lib/models/Progress';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    // Check authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // Await params in Next.js 16
    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch video from database using YouTube videoId
    const video = await Video.findOne({
      videoId: videoId,
      userId: decoded.userId
    });
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Fetch learning materials (chapters and prerequisites)
    const learningMaterial = await LearningMaterial.findOne({
      videoId: videoId, // YouTube video ID
      userId: decoded.userId
    });

    // Fetch flashcards
    const flashcards = await Flashcard.find({
      videoId: videoId, // YouTube video ID
      userId: decoded.userId
    });

    // Fetch quizzes
    const quizzes = await Quiz.find({
      videoId: videoId, // YouTube video ID
      userId: decoded.userId
    });

    // Fetch user progress
    const progress = await Progress.findOne({
      videoId: videoId, // YouTube video ID
      userId: decoded.userId
    });

    // Fetch mind map
    const mindMap = await MindMap.findOne({ videoId: videoId, userId: decoded.userId });

    // Determine which materials are available/generated
    const hasMaterials = {
      flashcards: flashcards.length > 0,
      quizzes: quizzes.length > 0,
      prerequisites: (learningMaterial?.prerequisites?.length ?? 0) > 0,
      mindmap: mindMap && mindMap.nodes && mindMap.nodes.length > 0,
      casestudies: (learningMaterial?.realWorldProblems?.length ?? 0) > 0
    };

    // Format response
    const materials = {
      video: {
        id: video._id.toString(),
        videoId: video.videoId,
        youtubeUrl: video.youtubeUrl,
        title: video.title,
        channelName: video.channelName,
        thumbnailUrl: video.thumbnail,
        duration: video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : undefined,
        createdAt: video.createdAt
      },
      flashcards: flashcards.map(fc => ({
        id: fc._id.toString(),
        question: fc.question,
        answer: fc.answer,
        isMastered: progress?.masteredFlashcardIds?.some((id) => id.toString() === fc._id.toString()) || false,
        isUserCreated: fc.generationType === 'human'
      })),
      quizzes: quizzes.map(quiz => ({
        id: quiz._id.toString(),
        questionText: quiz.questionText,
        type: 'multiple-choice',
        options: quiz.options,
        correctAnswerIndex: quiz.correctAnswerIndex,
        explanation: quiz.explanation || ''
      })),
      transcript: video.transcript.map((t: ITranscriptSegment) => ({
        text: t.text,
        start: t.offset,
        duration: t.duration
      })),
      chapters: learningMaterial?.chapters?.map((chapter: IChapter) => ({
        id: chapter.id,
        timeSeconds: chapter.timeSeconds,
        topic: chapter.topic,
        description: chapter.description
      })) || [],
      prerequisites: learningMaterial?.prerequisites.map((prereq: IPrerequisite) => ({
        id: prereq.id,
        title: prereq.topic,
        description: `Understanding of ${prereq.topic} (${prereq.difficulty} level)`,
        required: prereq.difficulty === 'beginner' || prereq.difficulty === 'intermediate'
      })) || [],
      prerequisiteQuiz: [], // TODO: Add prerequisite quiz questions if needed
      mindMap: mindMap ? {
        nodes: mindMap.nodes,
        edges: mindMap.edges,
      } : {
        nodes: [],
        edges: [],
      },
      realWorldProblems: learningMaterial?.realWorldProblems?.map((problem: IRealWorldProblem) => ({
        id: problem.id,
        title: problem.title,
        scenario: problem.scenario,
        hints: problem.hints
      })) || [],
      videoSummary: learningMaterial?.videoSummary || undefined,
      // Include processing status and error info
      processingStatus: video.processingStatus,
      materialsStatus: video.materialsStatus || 'generating',
      incompleteMaterials: video.incompleteMaterials || [],
      hasAllMaterials: Object.values(hasMaterials).every(v => v),
      availableMaterials: hasMaterials,
      error: video.errorMessage ? {
        type: video.errorType,
        message: video.errorMessage
      } : null
    };

    return NextResponse.json(materials);

  } catch (error) {
    console.error('Error fetching video materials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
