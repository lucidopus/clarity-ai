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
import { generateEmbeddings } from '@/lib/embedding';
import { GEMINI_MODEL_NAME } from '@/lib/sdk';
import { resolveClientDay } from '@/lib/date.utils';
import { calculateLLMCost, calculateApifyCost, getCurrentModelInfo } from '@/lib/cost/calculator';
import { logGenerationCost, calculateTotalCost, formatCost } from '@/lib/cost/logger';
import type { IServiceUsage } from '@/lib/models/Cost';
import { CostSource } from '@/lib/models/Cost';
import { ApiError, InvalidURLError, DuplicateVideoError } from '@/lib/errors/ApiError';

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
    // ... (rest of the file remains same until cost calculation)

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
      const invalidUrlError = new InvalidURLError();
      return NextResponse.json(
        { error: invalidUrlError.message, errorType: invalidUrlError.code },
        { status: invalidUrlError.statusCode }
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
      const duplicateError = new DuplicateVideoError();
      return NextResponse.json(
        {
          error: duplicateError.message,
          errorType: duplicateError.code,
          videoId: existingVideo.videoId, // YouTube video ID for redirect
        },
        { status: duplicateError.statusCode }
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
      // Use the end of the last segment (offset + duration) as video duration
      let totalDuration = 0;
      if (transcriptResult.segments.length > 0) {
        // Find the segment that ends the latest
        totalDuration = Math.max(
          ...transcriptResult.segments.map(s => s.offset + s.duration)
        );
      }
      console.log(`📊 [VIDEO PROCESS] Calculated video duration: ${totalDuration} seconds (${Math.floor(totalDuration / 60)}:${String(Math.floor(totalDuration % 60)).padStart(2, '0')})`);

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

      // Extract error code and status from ApiError
      let errorCode = 'UNKNOWN_ERROR';
      let statusCode = 500;
      let errorMessage = 'Failed to extract transcript';

      if (error instanceof ApiError) {
        errorCode = error.code;
        statusCode = error.statusCode;
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Update video record with error information
      await Video.findByIdAndUpdate(videoDoc._id, {
        processingStatus: 'failed',
        errorType: errorCode,
        errorMessage: `Transcript extraction failed: ${errorMessage}`,
      });

      return NextResponse.json(
        {
          error: errorMessage,
          errorType: errorCode,
        },
        { status: statusCode }
      );
    }

    // 6. Validate educational content (if enabled)
    if (process.env.ENABLE_CONTENT_VALIDATION === 'true') {
      console.log('🔍 [VIDEO PROCESS] Step 6.5: Validating educational content...');
      
      try {
        const { validateEducationalContent, logValidationDecision } = await import('@/lib/content-validator');
        const { NonEducationalContentError } = await import('@/lib/errors/ApiError');
        
        const validationStartTime = Date.now();
        const validation = await validateEducationalContent(transcriptResult.text);
        const validationDuration = Date.now() - validationStartTime;
        
        // Log validation decision to SystemLog
        await logValidationDecision({
          userId: decoded.userId,
          videoId: videoId,
          validation,
          snippetLength: Math.min(transcriptResult.text.length, 2000),
          model: process.env.CONTENT_VALIDATION_MODEL || 'gemini-2.0-flash-exp',
        });
        
        // Track validation cost
        const validationCost = calculateLLMCost(
          validation.usage.promptTokens,
          validation.usage.completionTokens,
          process.env.CONTENT_VALIDATION_MODEL || 'gemini-2.0-flash-exp'
        );
        
        services.push({
          service: ServiceType.CONTENT_VALIDATION,
          usage: {
            cost: validationCost,
            unitDetails: {
              inputTokens: validation.usage.promptTokens,
              outputTokens: validation.usage.completionTokens,
              duration: validationDuration,
              metadata: {
                confidence: validation.confidence,
                reason: validation.reason,
                suggestedCategory: validation.suggestedCategory,
              },
            },
          },
          status: validation.isEducational ? 'success' : 'rejected',
        });
        
        console.log(`💰 [COST] Content validation: ${validation.usage.promptTokens} input + ${validation.usage.completionTokens} output tokens = ${formatCost(validationCost)}`);
        
        // If non-educational, mark as validation_rejected and return
        if (!validation.isEducational) {
          console.log(`❌ [VIDEO PROCESS] Non-educational content detected: ${validation.reason}`);
          console.log(`🔍 [VIDEO PROCESS] Confidence: ${validation.confidence}`);
          
          // Log costs before rejecting
          const totalCost = calculateTotalCost(services);
          await logGenerationCost({
            userId: decoded.userId,
            source: CostSource.LEARNING_MATERIAL_GENERATION,
            videoId: videoDoc._id,
            services,
            totalCost,
          });
          console.log(`✅ [VIDEO PROCESS] Cost logged: ${formatCost(totalCost)} total`);
          
          // Update video status to validation_rejected (retriable)
          await Video.findByIdAndUpdate(videoDoc._id, {
            processingStatus: 'validation_rejected',
            errorType: 'NON_EDUCATIONAL_CONTENT',
            errorMessage: validation.reason,
          });
          
          // Return error to user with override option
          const error = new NonEducationalContentError(validation.reason);
          const responsePayload = {
            error: error.message,
            errorType: error.code,
            details: validation.reason,
            confidence: validation.confidence,
            videoId: videoDoc._id.toString(), // Include videoId for override handling
          };
          console.log('📤 [VIDEO PROCESS] Sending validation rejection response:', JSON.stringify(responsePayload));
          return NextResponse.json(
            responsePayload,
            { status: error.statusCode }
          );
        }
        
        console.log(`✅ [VIDEO PROCESS] Educational content validated (confidence: ${validation.confidence})`);
        if (validation.suggestedCategory) {
          console.log(`💡 [VIDEO PROCESS] Suggested category: ${validation.suggestedCategory}`);
        }
        
      } catch (validationError) {
        console.error('⚠️ [VIDEO PROCESS] Content validation failed (non-critical):', validationError);
        // Fail-open: continue processing if validation fails
      }
    } else {
      console.log('⏭️ [VIDEO PROCESS] Content validation disabled, skipping...');
    }

    // 7. Generate learning materials
    console.log('🤖 [VIDEO PROCESS] Step 7: Generating learning materials with LLM...');
    console.log(`📊 [VIDEO PROCESS] Sending ${transcriptResult.text.length} characters to LLM...`);
    let materials = null;
    let llmUsage = null;
    let llmError = null;
    let llmErrorCode = null;
    const modelInfo = getCurrentModelInfo(GEMINI_MODEL_NAME);

    try {
      console.log(`🤖 [VIDEO PROCESS] Using model: ${modelInfo.model} (input: $${modelInfo.inputCostPerMillion}/M, output: $${modelInfo.outputCostPerMillion}/M)`);

      const llmResponse = await generateLearningMaterials(transcriptResult.text);
      materials = llmResponse.materials;
      llmUsage = llmResponse.usage;

      // Transform problem IDs to be globally unique (prepend videoId)
      // This prevents cross-video contamination in guide chatbot
      if (materials.realWorldProblems && materials.realWorldProblems.length > 0) {
        materials.realWorldProblems = materials.realWorldProblems.map(problem => ({
          ...problem,
          id: `${videoId}_${problem.id}` // Transform "rp1" → "videoId_rp1"
        }));
        console.log(`🔄 [VIDEO PROCESS] Transformed ${materials.realWorldProblems.length} problem IDs to include videoId prefix`);
      }

      console.log('✅ [VIDEO PROCESS] LLM generation successful!');
      console.log(`📚 [VIDEO PROCESS] Generated: ${materials.flashcards.length} flashcards, ${materials.quizzes.length} quizzes, ${materials.chapters.length} chapters, ${materials.prerequisites.length} prerequisites, ${materials.realWorldProblems.length} case studies`);

      // Track LLM cost
      const llmCost = calculateLLMCost(llmUsage.promptTokens, llmUsage.completionTokens, GEMINI_MODEL_NAME);
      const serviceType = ServiceType.GEMINI_LLM;

      services.push({
        service: serviceType,
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
              chaptersGenerated: materials.chapters.length,
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
      llmError = error;

      // Extract error code from ApiError
      if (error instanceof ApiError) {
        llmErrorCode = error.code;
      } else {
        llmErrorCode = 'LLM_PARTIAL_FAILURE';
      }

      console.log('⚠️ [VIDEO PROCESS] LLM failed but transcript is available - will save as partial success');
    }

    // 7. Save learning materials to database (only if LLM succeeded)
    if (materials) {
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

      // Save mind map to database (upsert if already exists)
      console.log('💾 [VIDEO PROCESS] Saving mind map...');
      await MindMap.findOneAndUpdate(
        {
          userId: decoded.userId,
          videoId: videoId,
        },
        {
          userId: decoded.userId,
          videoId: videoId,
          nodes: materials.mindMap.nodes,
          edges: materials.mindMap.edges,
          metadata: {
            generatedBy: 'ai',
            generatedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
      console.log(`✅ [VIDEO PROCESS] Mind map saved with ${materials.mindMap.nodes.length} nodes and ${materials.mindMap.edges.length} edges`);

      // Save chapters, prerequisites, and real-world problems in learning materials collection
      console.log(`💾 [VIDEO PROCESS] Saving ${materials.chapters.length} chapters, ${materials.prerequisites.length} prerequisites, and ${materials.realWorldProblems.length} real-world problems...`);
      await LearningMaterial.create({
        videoId: videoId, // YouTube video ID
        userId: decoded.userId,
        chapters: materials.chapters,
        prerequisites: materials.prerequisites,
        realWorldProblems: materials.realWorldProblems,
        videoSummary: materials.videoSummary,
        metadata: {
          generatedBy: modelInfo.model,
          generatedAt: new Date(),
        },
      });
      console.log('✅ [VIDEO PROCESS] Learning materials saved');
    } else {
      console.log('⚠️ [VIDEO PROCESS] Skipping learning materials save - LLM generation failed');
    }

    // 8. Update video with status & embedding
    console.log('✅ [VIDEO PROCESS] Step 9: Updating video using materials & embedding...');

    if (llmError || !materials) {
      // CASE: LLM Failed
      const incompleteMaterials = ['flashcards', 'quizzes', 'prerequisites', 'mindmap', 'casestudies'];
      await Video.findByIdAndUpdate(videoDoc._id, {
        title: `Video ${videoId}`,
        processingStatus: 'completed_with_warning',
        materialsStatus: 'incomplete',
        incompleteMaterials: incompleteMaterials,
        errorType: llmErrorCode,
        errorMessage: llmError instanceof Error ? llmError.message : 'LLM generation failed',
        processedAt: new Date(),
      });
      console.log('⚠️ [VIDEO PROCESS] Video marked as completed_with_warning (No embeddings generated).');
    
    } else {
      // CASE: LLM Succeeded -> Generate Embedding & Save Full Data
      console.log('🧠 [VIDEO PROCESS] Generating embedding...');
      let embedding: number[] = [];
      try {
        const transcriptSnippet = transcriptResult.text.slice(0, 1000);
        const embeddingContext = `
          Title: ${materials.title}
          Category: ${materials.category}
          Summary: ${materials.videoSummary}
          Tags: ${materials.tags.join(', ')}
          Transcript Start: ${transcriptSnippet}
        `.trim();
        
        const embeddingResult = await generateEmbeddings(embeddingContext);
        embedding = Array.isArray(embeddingResult) && Array.isArray(embeddingResult[0]) 
          ? (embeddingResult as number[][])[0] 
          : (embeddingResult as number[]);
          
        console.log(`✅ [VIDEO PROCESS] Generated 1536d embedding`);
      } catch (embError) {
        console.error('⚠️ [VIDEO PROCESS] Embedding generation failed (non-critical):', embError);
      }

      const updatePayload = {
        title: materials.title,
        category: materials.category,
        tags: materials.tags,
        summary: materials.videoSummary,
        embedding: embedding,
        processingStatus: 'completed',
        materialsStatus: 'complete',
        incompleteMaterials: [],
        processedAt: new Date(),
      };

      await Video.findByIdAndUpdate(videoDoc._id, updatePayload);
      console.log('✅ [VIDEO PROCESS] Video marked as completed with complete materials and embedding');
    }

    // 9. Log video generation activity (only if materials generated)
    if (materials) {
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
            chaptersGenerated: materials.chapters.length,
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
    } else {
      console.log('⚠️ [VIDEO PROCESS] Skipping activity log - no materials generated');
    }

    // 10. Log API usage costs
    console.log('💰 [VIDEO PROCESS] Step 11: Logging API usage costs...');
    try {
      const totalCost = calculateTotalCost(services);
      await logGenerationCost({
        userId: decoded.userId,
        source: CostSource.LEARNING_MATERIAL_GENERATION,
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
    if (llmError) {
      // Partial success - transcript available but LLM failed
      console.log(`⚠️ [VIDEO PROCESS] Pipeline completed with warnings! YouTube Video ID: ${videoId}`);
      return NextResponse.json({
        success: true,
        videoId: videoId, // YouTube video ID (e.g., "dQw4w9WgXcQ")
        warning: {
          type: llmErrorCode,
          message: llmError instanceof Error ? llmError.message : 'Some materials could not be generated',
        },
      }, { status: 200 });
    } else {
      // Full success
      console.log(`🎉 [VIDEO PROCESS] Pipeline completed successfully! YouTube Video ID: ${videoId}`);
      return NextResponse.json({
        success: true,
        videoId: videoId, // YouTube video ID (e.g., "dQw4w9WgXcQ")
        message: 'Video processed successfully',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('💥 [VIDEO PROCESS] FATAL ERROR: Unexpected error in pipeline:', error);
    console.error('💥 [VIDEO PROCESS] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Extract error information if it's an ApiError
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error instanceof ApiError) {
      errorCode = error.code;
      statusCode = error.statusCode;
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage, errorType: errorCode },
      { status: statusCode }
    );
  }
}
