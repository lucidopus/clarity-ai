import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import { getYouTubeTranscript, extractVideoId, isValidYouTubeUrl } from '@/lib/transcript';
import { generateLearningMaterials } from '@/lib/llm';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function POST(request: NextRequest) {
  console.log('🚀 [VIDEO PROCESS] Starting video processing pipeline...');

  try {
    // 1. Verify authentication
    console.log('🔐 [VIDEO PROCESS] Step 1: Verifying authentication...');
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      console.log('❌ [VIDEO PROCESS] Authentication failed: No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    console.log(`✅ [VIDEO PROCESS] Authentication successful for user: ${decoded.userId}`);

    // 2. Parse request
    console.log('📝 [VIDEO PROCESS] Step 2: Parsing request body...');
    const { youtubeUrl } = await request.json();
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      console.log('❌ [VIDEO PROCESS] Invalid request: YouTube URL missing');
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }
    console.log(`📺 [VIDEO PROCESS] YouTube URL received: ${youtubeUrl}`);

    // 3. Validate URL
    console.log('🔍 [VIDEO PROCESS] Step 3: Validating YouTube URL format...');
    if (!isValidYouTubeUrl(youtubeUrl)) {
      console.log(`❌ [VIDEO PROCESS] URL validation failed: ${youtubeUrl}`);
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }
    console.log('✅ [VIDEO PROCESS] URL format valid');

    console.log('🔌 [VIDEO PROCESS] Connecting to database...');
    await dbConnect();
    console.log('✅ [VIDEO PROCESS] Database connected');

    const videoId = extractVideoId(youtubeUrl);
    console.log(`🎬 [VIDEO PROCESS] Extracted video ID: ${videoId}`);

    // Check if video already processed for this user
    console.log('🔎 [VIDEO PROCESS] Step 4: Checking for duplicate video...');
    const existingVideo = await Video.findOne({
      userId: decoded.userId,
      videoId: videoId,
    });

    if (existingVideo) {
      console.log(`♻️ [VIDEO PROCESS] Video already processed: ${existingVideo._id.toString()}`);
      return NextResponse.json(
        {
          videoId: existingVideo._id.toString(),
          message: 'Video already processed',
        },
        { status: 200 }
      );
    }
    console.log('✅ [VIDEO PROCESS] No duplicate found, proceeding with new video');

    // 4. Create video entry (processing status: processing)
    console.log('💾 [VIDEO PROCESS] Step 5: Creating video entry in database...');
    const videoDoc = await Video.create({
      userId: decoded.userId,
      youtubeUrl,
      videoId,
      title: 'Processing...',
      processingStatus: 'processing',
      transcript: [],
      language: 'en',
    });
    console.log(`✅ [VIDEO PROCESS] Video entry created with ID: ${videoDoc._id.toString()}`);

    // 5. Extract transcript
    console.log('📜 [VIDEO PROCESS] Step 6: Extracting transcript from YouTube...');
    let transcriptResult;
    try {
      transcriptResult = await getYouTubeTranscript(youtubeUrl);
      console.log(`✅ [VIDEO PROCESS] Transcript extracted successfully: ${transcriptResult.segments.length} segments, ${transcriptResult.text.length} characters`);

      // Update video with transcript and metadata
      console.log('💾 [VIDEO PROCESS] Saving transcript to database...');
      await Video.findByIdAndUpdate(videoDoc._id, {
        transcript: transcriptResult.segments.map((seg) => ({
          text: seg.text,
          offset: seg.offset,
          duration: seg.duration,
          lang: 'en',
        })),
        title: `Video ${videoId}`, // Basic title, can be enhanced with YouTube API
      });
      console.log('✅ [VIDEO PROCESS] Transcript saved to database');
    } catch (error) {
      console.error('❌ [VIDEO PROCESS] Transcript extraction failed:', error);
      await Video.findByIdAndUpdate(videoDoc._id, {
        processingStatus: 'failed',
        errorMessage: `Transcript extraction failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
      return NextResponse.json(
        {
          error: `Failed to extract transcript: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
        { status: 400 }
      );
    }

    // 6. Generate learning materials
    console.log('🤖 [VIDEO PROCESS] Step 7: Generating learning materials with LLM...');
    console.log(`📊 [VIDEO PROCESS] Sending ${transcriptResult.text.length} characters to Groq LLM...`);
    let materials;
    try {
      materials = await generateLearningMaterials(transcriptResult.text);
      console.log('✅ [VIDEO PROCESS] LLM generation successful!');
      console.log(`📚 [VIDEO PROCESS] Generated: ${materials.flashcards.length} flashcards, ${materials.quizzes.length} quizzes, ${materials.timestamps.length} timestamps, ${materials.prerequisites.length} prerequisites`);
    } catch (error) {
      console.error('❌ [VIDEO PROCESS] LLM generation failed:', error);
      await Video.findByIdAndUpdate(videoDoc._id, {
        processingStatus: 'failed',
        errorMessage: `LLM generation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
      return NextResponse.json(
        {
          error: `Failed to generate materials: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
        { status: 500 }
      );
    }

    // 7. Save learning materials to database
    console.log('💾 [VIDEO PROCESS] Step 8: Saving learning materials to database...');

    // Save flashcards
    console.log(`💾 [VIDEO PROCESS] Saving ${materials.flashcards.length} flashcards...`);
    await Flashcard.insertMany(
      materials.flashcards.map((fc) => ({
        userId: decoded.userId,
        videoId: videoDoc._id,
        question: fc.question,
        answer: fc.answer,
        difficulty: fc.difficulty,
        generationType: 'ai',
      }))
    );
    console.log('✅ [VIDEO PROCESS] Flashcards saved');

    // Save quizzes
    console.log(`💾 [VIDEO PROCESS] Saving ${materials.quizzes.length} quizzes...`);
    await Quiz.insertMany(
      materials.quizzes.map((quiz) => ({
        userId: decoded.userId,
        videoId: videoDoc._id,
        questionText: quiz.questionText,
        options: quiz.options,
        correctAnswerIndex: quiz.correctAnswerIndex,
        explanation: quiz.explanation,
        difficulty: 'medium', // Default difficulty
        generationType: 'ai',
      }))
    );
    console.log('✅ [VIDEO PROCESS] Quizzes saved');

    // Save timestamps and prerequisites in learning materials collection
    console.log(`💾 [VIDEO PROCESS] Saving ${materials.timestamps.length} timestamps and ${materials.prerequisites.length} prerequisites...`);
    await LearningMaterial.create({
      videoId: videoDoc._id,
      userId: decoded.userId,
      timestamps: materials.timestamps,
      prerequisites: materials.prerequisites,
      metadata: {
        generatedBy: 'llama-3.3-70b-versatile',
        generatedAt: new Date(),
      },
    });
    console.log('✅ [VIDEO PROCESS] Learning materials saved');

    // 8. Update video status: completed
    console.log('✅ [VIDEO PROCESS] Step 9: Marking video as completed...');
    await Video.findByIdAndUpdate(videoDoc._id, {
      processingStatus: 'completed',
      processedAt: new Date(),
    });
    console.log('✅ [VIDEO PROCESS] Video marked as completed');

    // 9. Return success with videoId
    console.log(`🎉 [VIDEO PROCESS] Pipeline completed successfully! Video ID: ${videoDoc._id.toString()}`);
    return NextResponse.json({
      success: true,
      videoId: videoDoc._id.toString(),
      message: 'Video processed successfully',
    });
  } catch (error) {
    console.error('💥 [VIDEO PROCESS] FATAL ERROR: Unexpected error in pipeline:', error);
    console.error('💥 [VIDEO PROCESS] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

