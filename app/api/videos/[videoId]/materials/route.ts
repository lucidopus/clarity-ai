import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
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
    // Fetch video first to determine ownership and visibility
    const video = await Video.findOne({ videoId });

    if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Authorization Check: Must be owner OR video is public
    const isOwner = video.userId.toString() === decoded.userId;
    const isPublic = video.visibility === 'public';

    if (!isOwner && !isPublic) {
        return NextResponse.json({ error: 'Unauthorized access to private video' }, { status: 403 });
    }

    // Read-only for non-owners
    const isReadOnly = !isOwner;

    // Fetch author username
    const author = await User.findById(video.userId).select('username').lean();
    const authorUsername = (author as any)?.username || undefined;

    // Material Owner: Materials belong to the video creator
    const ownerId = video.userId;

    // Fetch materials using the OWNER ID
    const learningMaterial = await LearningMaterial.findOne({
      videoId: videoId, 
      userId: ownerId
    });

    const flashcards = await Flashcard.find({
      videoId: videoId, 
      userId: ownerId
    });

    const quizzes = await Quiz.find({
      videoId: videoId, 
      userId: ownerId
    });

    // Fetch user progress using the VIEWER ID (decoded.userId)
    const progress = await Progress.findOne({
      videoId: videoId, 
      userId: decoded.userId 
    });

    // Fetch mind map (Owner's)
    const mindMap = await MindMap.findOne({ videoId: videoId, userId: ownerId });

    // Determine which materials are available/generated
    const hasMaterials = {
      flashcards: flashcards.length > 0,
      quizzes: quizzes.length > 0,
      prerequisites: (learningMaterial?.prerequisites?.length ?? 0) > 0,
      mindmap: mindMap && mindMap.nodes && mindMap.nodes.length > 0,
      casestudies: (learningMaterial?.realWorldProblems?.length ?? 0) > 0
    };

    // Create a map of latest quiz attempts
    const latestAttempts = new Map();
    if (progress?.quizAttempts) {
      for (const attempt of progress.quizAttempts) {
        const qId = attempt.quizId.toString();
        // Since we now update in place, there is only one entry per quizId
        latestAttempts.set(qId, attempt);
      }
    }

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
        isMastered: progress?.masteredFlashcardIds?.some((id: mongoose.Types.ObjectId) => id.toString() === fc._id.toString()) || false,
        isUserCreated: fc.generationType === 'human'
      })),
      quizzes: quizzes.map(quiz => {
        const qId = quiz._id.toString();
        const isMastered = progress?.masteredQuizIds?.some((id: mongoose.Types.ObjectId) => id.toString() === qId) || false;
        const latestAttempt = latestAttempts.get(qId);

        return {
          id: qId,
          questionText: quiz.questionText,
          type: 'multiple-choice',
          options: quiz.options,
          correctAnswerIndex: quiz.correctAnswerIndex,
          explanation: quiz.explanation || '',
          isMastered,
          userAnswer: latestAttempt?.userAnswerIndex
        };
      }),
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
      } : null,
      // Public access flags
      isReadOnly,
      authorUsername
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
