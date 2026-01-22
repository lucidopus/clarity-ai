import { generateLearningMaterialsChunked } from './llm';
import { generateEmbeddings } from './embedding';
import Video from './models/Video';
import Flashcard from './models/Flashcard';
import Quiz from './models/Quiz';
import LearningMaterial from './models/LearningMaterial';
import { MindMap } from './models';

/**
 * Shared utility functions for video retry processing
 */

// Type definitions for video retry processing
interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

// Use Record types for flexibility with LLM output structures
type RealWorldProblem = Record<string, unknown> & { id: string };
type FlashcardItem = Record<string, unknown> & { question: string; answer: string };
type QuizItem = Record<string, unknown> & { questionText: string; options: string[] };

interface LearningMaterials {
  title: string;
  category: string;
  tags: string[];
  videoSummary: string;
  chapters?: Array<Record<string, unknown>>;
  flashcards?: FlashcardItem[];
  quizzes?: QuizItem[];
  prerequisites?: Array<Record<string, unknown>>;
  realWorldProblems?: RealWorldProblem[];
  mindMap?: { nodes: unknown[]; edges?: unknown[] };
}

interface VideoDocument {
  _id: string;
  videoId: string;
  userId: string;
  transcript: TranscriptSegment[];
  embedding?: number[];
  incompleteMaterials?: string[];
  errorType?: string;
}

/**
 * Determines if an error type indicates a token limit issue
 */
export function isTokenLimitError(errorType: string): boolean {
  return ['LLM_TOKEN_LIMIT', 'LLM_TIMEOUT'].includes(errorType);
}

/**
 * Determines if an error is permanent and should not be retried
 */
export function isPermanentError(errorType: string): boolean {
  return [
    'API_KEY_ERROR',
    'PERMISSION_DENIED',
    'CONTENT_FILTERED',
    'INVALID_REQUEST',
    'RECITATION',
  ].includes(errorType);
}

/**
 * Process a video using chunked generation (for long videos)
 */
export async function processVideoChunked(video: VideoDocument) {
  console.log(`🔧 Starting chunked generation for ${video.videoId}`);
  console.log(`📋 Incomplete materials: ${video.incompleteMaterials?.join(', ') || 'all'}`);

  // Get transcript
  const transcript = video.transcript.map((s) => s.text).join(' ');

  // Generate materials in chunks - pass incompleteMaterials for selective retry
  const chunkedResult = await generateLearningMaterialsChunked(
    transcript,
    video.incompleteMaterials || undefined
  );

  // Transform problem IDs to include videoId prefix
  if (chunkedResult.materials.realWorldProblems && chunkedResult.materials.realWorldProblems.length > 0) {
    chunkedResult.materials.realWorldProblems = chunkedResult.materials.realWorldProblems.map(
      (problem, index: number) => ({
        ...problem,
        id: `${video.videoId}-problem-${index + 1}`,
      })
    );
  }

  // Save materials to database
  await saveVideoMaterials(video, chunkedResult.materials, !chunkedResult.incompleteMaterials.includes('metadata'));

  // Determine incompleteMaterials for tracking
  // NOTE: Only track materials that FAILED generation, not those that were SKIPPED
  // Skipped materials return empty arrays but already exist in the database
  const incompleteMaterialsList: string[] = [...chunkedResult.incompleteMaterials];

  // Generate embedding if missing
  let embedding: number[] = video.embedding || [];
  
  if (!video.embedding || video.embedding.length === 0) {
    console.log(`🧠 Generating embedding for ${video.videoId}...`);
    try {
      const transcriptSnippet = transcript.slice(0, 1000);
      const embeddingContext = `
        Title: ${chunkedResult.materials.title}
        Category: ${chunkedResult.materials.category}
        Summary: ${chunkedResult.materials.videoSummary}
        Tags: ${chunkedResult.materials.tags.join(', ')}
        Transcript Start: ${transcriptSnippet}
      `.trim();
      
      const embeddingResult = await generateEmbeddings(embeddingContext);
      embedding = Array.isArray(embeddingResult) && Array.isArray(embeddingResult[0]) 
        ? (embeddingResult as number[][])[0] 
        : (embeddingResult as number[]);
        
      console.log(`✅ Generated 1536d embedding for ${video.videoId}`);
    } catch (embError) {
      console.warn(`⚠️ Embedding generation failed (non-critical) for ${video.videoId}:`, embError as Record<string, unknown>);
    }
  } else {
    console.log(`⏭️  Skipping embedding generation for ${video.videoId} - already exists (${video.embedding.length} dimensions)`);
  }

  // Update video status
  
  if (incompleteMaterialsList.length === 0) {
    // Complete success
    await Video.findByIdAndUpdate(video._id, {
      processingStatus: 'completed',
      materialsStatus: 'complete',
      incompleteMaterials: [],
      embedding,
    });
    console.log(`✅ Video ${video.videoId} completed successfully with chunked generation`);
    return { success: true, videoId: video.videoId, method: 'chunked' };
  } else {
    // Partial success - still has incomplete materials
    await Video.findByIdAndUpdate(video._id, {
      processingStatus: 'completed_with_warning',
      materialsStatus: 'incomplete',
      incompleteMaterials: incompleteMaterialsList,
      embedding,
    });
    console.log(`⚠️ Video ${video.videoId} partially completed. Incomplete: ${incompleteMaterialsList.join(', ')}`);
    return { 
      success: false, 
      videoId: video.videoId, 
      method: 'chunked',
      incompleteMaterials: incompleteMaterialsList 
    };
  }
}

/**
 * Process a video using standard retry (for transient errors)
 */
/**
 * Process a video using standard retry (for transient errors or validation overrides)
 */
export async function processVideoStandard(video: VideoDocument) {
  console.log(`🔄 Retrying video ${video.videoId} with standard approach`);
  
  // Import dynamically to avoid circular dependencies if any
  const { generateLearningMaterials } = await import('./llm');
  
  // Get transcript
  const transcript = video.transcript.map((s) => s.text).join(' ');
  console.log(`📝 Transcript length: ${transcript.length} characters`);

  try {
    // Generate materials using standard (non-chunked) approach
    const llmResponse = await generateLearningMaterials(transcript);
    const materials = llmResponse.materials;

    // Transform problem IDs
    if (materials.realWorldProblems && materials.realWorldProblems.length > 0) {
      materials.realWorldProblems = materials.realWorldProblems.map(
        (problem, index: number) => ({
          ...problem,
          id: `${video.videoId}-problem-${index + 1}`,
        })
      );
    }

    // Save materials
    await saveVideoMaterials(video, materials, true);

    // Generate embedding
    console.log(`🧠 Generating embedding for ${video.videoId}...`);
    let embedding: number[] = video.embedding || [];
    try {
        const transcriptSnippet = transcript.slice(0, 1000);
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
          
        console.log(`✅ Generated 1536d embedding for ${video.videoId}`);
    } catch (embError) {
        console.warn(`⚠️ Embedding generation failed (non-critical) for ${video.videoId}:`, embError);
    }

    // Mark as complete
    await Video.findByIdAndUpdate(video._id, {
      processingStatus: 'completed',
      materialsStatus: 'complete',
      incompleteMaterials: [],
      embedding,
      errorType: null,
      errorMessage: null,
      processedAt: new Date(),
    });

    console.log(`✅ Video ${video.videoId} standard retry succeeded!`);
    return { success: true, videoId: video.videoId, method: 'standard' };

  } catch (error) {
    console.error(`❌ Standard retry failed for ${video.videoId}:`, error);
    throw error; // Re-throw to be handled by the caller (which logs it and keeps it pending)
  }
}

/**
 * Save generated materials to database
 * @param metadataWasGenerated - If true, update video metadata fields. If false, skip to avoid overwriting with placeholders.
 */
async function saveVideoMaterials(video: VideoDocument, materials: LearningMaterials, metadataWasGenerated: boolean = true) {
  // Models are already imported at the top of the file
  
  // Save flashcards
  if (materials.flashcards && materials.flashcards.length > 0) {
    await Flashcard.deleteMany({ videoId: video.videoId });
    await Flashcard.insertMany(
      materials.flashcards.map((card) => ({
        ...card,
        videoId: video.videoId,
        userId: video.userId,
        generationType: 'ai',
        difficulty: (card as Record<string, unknown>).difficulty || 'medium',
      }))
    );
  }

  // Save quizzes
  if (materials.quizzes && materials.quizzes.length > 0) {
    await Quiz.deleteMany({ videoId: video.videoId });
    await Quiz.insertMany(
      materials.quizzes.map((quiz) => ({
        ...quiz,
        videoId: video.videoId,
        userId: video.userId,
        generationType: 'ai',
        difficulty: (quiz as Record<string, unknown>).difficulty || 'medium',
      }))
    );
  }

  // Save learning materials (prerequisites + case studies)
  if (
    (materials.prerequisites && materials.prerequisites.length > 0) ||
    (materials.realWorldProblems && materials.realWorldProblems.length > 0)
  ) {
    await LearningMaterial.deleteMany({ videoId: video.videoId });
    await LearningMaterial.create({
      videoId: video.videoId,
      userId: video.userId,
      prerequisites: materials.prerequisites || [],
      realWorldProblems: materials.realWorldProblems || [],
      videoSummary: materials.videoSummary || '',
      metadata: {
        generatedBy: 'retry-task',
        generatedAt: new Date(),
      },
    });
  }

  // Save mind map
  if (materials.mindMap && materials.mindMap.nodes && materials.mindMap.nodes.length > 0) {
    await MindMap.deleteMany({ videoId: video.videoId });
    await MindMap.create({
      videoId: video.videoId,
      userId: video.userId,
      nodes: materials.mindMap.nodes,
      edges: materials.mindMap.edges || [],
      metadata: {
        generatedBy: 'retry-task',
        generatedAt: new Date(),
      },
    });
  }

  // Update video metadata ONLY if it was actually generated (not skipped)
  // This prevents overwriting real metadata with placeholder values during selective retry
  if (metadataWasGenerated) {
    await Video.findByIdAndUpdate(video._id, {
      title: materials.title,
      category: materials.category,
      tags: materials.tags,
      summary: materials.videoSummary,
      chapters: materials.chapters || [],
    });
    console.log(`📝 Updated video metadata (title: ${materials.title})`);
  } else {
    console.log(`⏭️  Skipped video metadata update - using existing values`);
  }
}
