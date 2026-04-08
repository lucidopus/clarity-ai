import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Video from '@/lib/models/Video';
import MindMap from '@/lib/models/MindMap';
import { generateLearningMaterials } from '@/lib/llm';
import { verifyAdminToken } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  console.log('🚀 [MINDMAP MIGRATION] Starting mind map generation for existing videos...');

  try {
    // Verify admin authentication
    const isAdmin = await verifyAdminToken(request);
    if (!isAdmin) {
      console.log('❌ [MINDMAP MIGRATION] Authentication failed: Not admin');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ [MINDMAP MIGRATION] Admin authentication successful');

    await dbConnect();
    console.log('✅ [MINDMAP MIGRATION] Database connected');

    // Find all completed videos that don't have mind maps (admin: process all users)
    const videosWithoutMindMaps = await Video.find({
      processingStatus: 'completed',
    });

    console.log(`📊 [MINDMAP MIGRATION] Found ${videosWithoutMindMaps.length} completed videos`);

    const results = {
      total: videosWithoutMindMaps.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const video of videosWithoutMindMaps) {
      try {
        console.log(`🎬 [MINDMAP MIGRATION] Processing video: ${video.videoId} - ${video.title}`);
        results.processed++;

        // Check if mind map already exists
        const existingMindMap = await MindMap.findOne({
          videoId: video.videoId,
          userId: video.userId,
        });

        if (existingMindMap) {
          console.log(`⏭️ [MINDMAP MIGRATION] Mind map already exists for video: ${video.videoId}`);
          results.skipped++;
          continue;
        }

        // Check if video has transcript
        if (!video.transcript || video.transcript.length === 0) {
          console.log(`⚠️ [MINDMAP MIGRATION] No transcript found for video: ${video.videoId}`);
          results.errors.push(`No transcript for video ${video.videoId}`);
          results.failed++;
          continue;
        }

        // Extract transcript text
        const transcriptText = video.transcript
          .map((segment: { text: string }) => segment.text)
          .join(' ')
          .trim();

        if (!transcriptText) {
          console.log(`⚠️ [MINDMAP MIGRATION] Empty transcript for video: ${video.videoId}`);
          results.errors.push(`Empty transcript for video ${video.videoId}`);
          results.failed++;
          continue;
        }

        console.log(`🤖 [MINDMAP MIGRATION] Generating mind map for video: ${video.videoId} (${transcriptText.length} characters)`);

        // Generate learning materials with mind map
        const materials = await generateLearningMaterials(transcriptText);
        console.log(`✅ [MINDMAP MIGRATION] LLM generation successful for video: ${video.videoId}`);

        // Save mind map to database
        const mindMapDoc = new MindMap({
          videoId: video.videoId,
          userId: video.userId,
          nodes: materials.materials.mindMap.nodes,
          edges: materials.materials.mindMap.edges,
          metadata: {
            generatedBy: 'migration-ai',
            generatedAt: new Date(),
          },
        });

        await mindMapDoc.save();
        console.log(`💾 [MINDMAP MIGRATION] Mind map saved for video: ${video.videoId} (${materials.materials.mindMap.nodes.length} nodes, ${materials.materials.mindMap.edges.length} edges)`);

        results.successful++;

      } catch (error) {
        console.error(`❌ [MINDMAP MIGRATION] Failed to process video ${video.videoId}:`, error);
        results.errors.push(`Video ${video.videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.failed++;
      }
    }

    console.log(`🎉 [MINDMAP MIGRATION] Migration completed!`);
    console.log(`📊 [MINDMAP MIGRATION] Results: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`);

    return NextResponse.json({
      success: true,
      message: 'Mind map migration completed',
      results: results,
    });

  } catch (error) {
    console.error('💥 [MINDMAP MIGRATION] FATAL ERROR:', error);
    return NextResponse.json(
      { error: 'Internal server error during migration' },
      { status: 500 }
    );
  }
}