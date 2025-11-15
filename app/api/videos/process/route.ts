import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import LearningMaterial from '@/lib/models/LearningMaterial';
import Flashcard from '@/lib/models/Flashcard';
import Quiz from '@/lib/models/Quiz';
import { MindMap, ServiceType } from '@/lib/models';
import ActivityLog from '@/lib/models/ActivityLog';
import { getYouTubeTranscript, extractVideoId, isValidYouTubeUrl } from '@/lib/transcript';
import { generateLearningMaterials } from '@/lib/llm';
import { resolveClientDay } from '@/lib/date.utils';
import { calculateLLMCost, calculateApifyCost, getCurrentModelInfo } from '@/lib/cost/calculator';
import { logGenerationCost, calculateTotalCost, formatCost } from '@/lib/cost/logger';
import type { IServiceUsage } from '@/lib/models/Cost';

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
    const { youtubeUrl, clientTimestamp, timezoneOffsetMinutes, timeZone } = await request.json();
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
      console.log(`♻️ [VIDEO PROCESS] Video already processed: ${existingVideo.videoId}`);
      return NextResponse.json(
        {
          videoId: existingVideo.videoId, // YouTube video ID
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
    const services: IServiceUsage[] = [];

    try {
      const transcriptStartTime = Date.now();
      transcriptResult = await getYouTubeTranscript(youtubeUrl);
      const transcriptDuration = Date.now() - transcriptStartTime;
      console.log(`✅ [VIDEO PROCESS] Transcript extracted successfully: ${transcriptResult.segments.length} segments, ${transcriptResult.text.length} characters`);

      // Track Apify cost
      const apifyCost = calculateApifyCost();
      services.push({
        service: ServiceType.APIFY_TRANSCRIPT,
        usage: {
          cost: apifyCost,
          unitDetails: {
            duration: transcriptDuration,
            metadata: {
              segmentCount: transcriptResult.segments.length,
              characterCount: transcriptResult.text.length,
            },
          },
        },
        status: 'success',
      });
      console.log(`💰 [COST] Apify transcript extraction: ${formatCost(apifyCost)} (${transcriptDuration}ms)`);

      // Calculate total video duration from transcript segments
      const totalDuration = transcriptResult.segments.length > 0
        ? Math.max(...transcriptResult.segments.map(s => s.offset + s.duration))
        : 0;
      console.log(`📊 [VIDEO PROCESS] Calculated video duration: ${totalDuration} seconds`);

      // Update video with transcript and metadata
      console.log('💾 [VIDEO PROCESS] Saving transcript to database...');
      await Video.findByIdAndUpdate(videoDoc._id, {
        transcript: transcriptResult.segments.map((seg) => ({
          text: seg.text,
          offset: seg.offset,
          duration: seg.duration,
          lang: 'en',
        })),
        duration: totalDuration,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        channelName: 'YouTube',
        title: `Video ${videoId}`, // Temporary title, will be updated with LLM-generated title
      });
      console.log('✅ [VIDEO PROCESS] Transcript and metadata saved to database');
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
    let llmUsage;
    const modelInfo = getCurrentModelInfo();
    try {
      console.log(`🤖 [VIDEO PROCESS] Using model: ${modelInfo.model} (input: $${modelInfo.inputCostPerMillion}/M, output: $${modelInfo.outputCostPerMillion}/M)`);

      const llmResponse = await generateLearningMaterials(transcriptResult.text);
      materials = llmResponse.materials;
      llmUsage = llmResponse.usage;

      console.log('✅ [VIDEO PROCESS] LLM generation successful!');
      console.log(`📚 [VIDEO PROCESS] Generated: ${materials.flashcards.length} flashcards, ${materials.quizzes.length} quizzes, ${materials.timestamps.length} timestamps, ${materials.prerequisites.length} prerequisites, ${materials.realWorldProblems.length} case studies`);

      // Track LLM cost
      const llmCost = calculateLLMCost(llmUsage.promptTokens, llmUsage.completionTokens);
      services.push({
        service: ServiceType.GROQ_LLM,
        usage: {
          cost: llmCost,
          unitDetails: {
            inputTokens: llmUsage.promptTokens,
            outputTokens: llmUsage.completionTokens,
            totalTokens: llmUsage.totalTokens,
            metadata: {
              model: modelInfo.model,
              flashcardsGenerated: materials.flashcards.length,
              quizzesGenerated: materials.quizzes.length,
              timestampsGenerated: materials.timestamps.length,
              prerequisitesGenerated: materials.prerequisites.length,
              realWorldProblemsGenerated: materials.realWorldProblems.length,
              mindMapNodesGenerated: materials.mindMap.nodes.length,
              mindMapEdgesGenerated: materials.mindMap.edges.length,
            },
          },
        },
        status: 'success',
      });
      console.log(`💰 [COST] LLM (${modelInfo.model}): ${llmUsage.promptTokens} input + ${llmUsage.completionTokens} output tokens = ${formatCost(llmCost)}`);
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
        videoId: videoId, // YouTube video ID
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
        videoId: videoId, // YouTube video ID
        questionText: quiz.questionText,
        options: quiz.options,
        correctAnswerIndex: quiz.correctAnswerIndex,
        explanation: quiz.explanation,
        difficulty: 'medium', // Default difficulty
        generationType: 'ai',
      }))
    );
    console.log('✅ [VIDEO PROCESS] Quizzes saved');

    // Save mind map to database
    console.log('💾 [VIDEO PROCESS] Saving mind map...');
    const mindMapDoc = new MindMap({
      videoId: videoId,
      userId: decoded.userId,
      nodes: materials.mindMap.nodes,
      edges: materials.mindMap.edges,
      metadata: {
        generatedBy: 'ai',
        generatedAt: new Date(),
      },
    });
    await mindMapDoc.save();
    console.log(`✅ [VIDEO PROCESS] Mind map saved with ${materials.mindMap.nodes.length} nodes and ${materials.mindMap.edges.length} edges`);

    // Save timestamps, prerequisites, and real-world problems in learning materials collection
    console.log(`💾 [VIDEO PROCESS] Saving ${materials.timestamps.length} timestamps, ${materials.prerequisites.length} prerequisites, and ${materials.realWorldProblems.length} real-world problems...`);
    await LearningMaterial.create({
      videoId: videoId, // YouTube video ID
      userId: decoded.userId,
      timestamps: materials.timestamps,
      prerequisites: materials.prerequisites,
      realWorldProblems: materials.realWorldProblems,
      videoSummary: materials.videoSummary,
      metadata: {
        generatedBy: modelInfo.model,
        generatedAt: new Date(),
      },
    });
    console.log('✅ [VIDEO PROCESS] Learning materials saved');

    // 8. Update video with generated title and status: completed
    console.log('✅ [VIDEO PROCESS] Step 9: Updating video with generated title and marking as completed...');
    await Video.findByIdAndUpdate(videoDoc._id, {
      title: materials.title,
      processingStatus: 'completed',
      processedAt: new Date(),
    });
    console.log('✅ [VIDEO PROCESS] Video marked as completed');

    // 9. Log video generation activity
    console.log('📊 [VIDEO PROCESS] Step 10: Logging video generation activity...');
    try {
      const { now: logTimestamp, startOfDay } = resolveClientDay({ clientTimestamp, timezoneOffsetMinutes });
      await ActivityLog.create({
        userId: decoded.userId,
        activityType: 'video_generated',
        videoId: videoId,
        date: startOfDay,
        timestamp: logTimestamp,
        metadata: {
          flashcardsGenerated: materials.flashcards.length,
          quizzesGenerated: materials.quizzes.length,
          timestampsGenerated: materials.timestamps.length,
          prerequisitesGenerated: materials.prerequisites.length,
          mindMapNodesGenerated: materials.mindMap.nodes.length,
          mindMapEdgesGenerated: materials.mindMap.edges.length,
          ...(timeZone ? { clientTimeZone: timeZone } : {}),
          ...(typeof timezoneOffsetMinutes === 'number' ? { clientTimezoneOffsetMinutes: timezoneOffsetMinutes } : {}),
        },
      });
      console.log('✅ [VIDEO PROCESS] Activity logged successfully');
    } catch (activityError) {
      console.error('⚠️ [VIDEO PROCESS] Failed to log activity (non-critical):', activityError);
      // Don't fail the entire request if activity logging fails
    }

    // 10. Log API usage costs
    console.log('💰 [VIDEO PROCESS] Step 11: Logging API usage costs...');
    try {
      const totalCost = calculateTotalCost(services);
      await logGenerationCost({
        userId: decoded.userId,
        videoId: videoDoc._id,
        services,
        totalCost,
      });
      console.log(`✅ [VIDEO PROCESS] Cost logged successfully: ${formatCost(totalCost)} total`);
    } catch (costError) {
      console.error('⚠️ [VIDEO PROCESS] Failed to log costs (non-critical):', costError);
      // Don't fail the entire request if cost logging fails
    }

    // 11. Return success with YouTube videoId
    console.log(`🎉 [VIDEO PROCESS] Pipeline completed successfully! YouTube Video ID: ${videoId}`);
    return NextResponse.json({
      success: true,
      videoId: videoId, // YouTube video ID (e.g., "dQw4w9WgXcQ")
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
