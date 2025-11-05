require('dotenv').config({ path: '.env.local' });

import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import Video from '../lib/models/Video';
import LearningMaterial from '../lib/models/LearningMaterial';
import { generateLearningMaterials } from '../lib/llm';

async function migrateVideoSummaries() {
  console.log('🚀 Starting video summaries migration...');

  try {
    await dbConnect();
    console.log('✅ Database connected');

    // Find learning materials without videoSummary
    const materialsToUpdate = await LearningMaterial.find({
      $or: [
        { videoSummary: { $exists: false } },
        { videoSummary: '' },
        { videoSummary: null }
      ]
    });

    console.log(`📋 Found ${materialsToUpdate.length} learning materials needing video summaries`);

    let successCount = 0;
    let errorCount = 0;

    for (const material of materialsToUpdate) {
      try {
        console.log(`🔄 Processing video: ${material.videoId}`);

        // Find the corresponding video to get transcript
        const video = await Video.findOne({ videoId: material.videoId });
        if (!video) {
          console.error(`❌ Video not found for videoId: ${material.videoId}`);
          errorCount++;
          continue;
        }

        // Extract transcript text
        const transcriptText = video.transcript
          .map((seg: any) => seg.text)
          .join(' ');

        if (!transcriptText.trim()) {
          console.error(`❌ No transcript found for videoId: ${material.videoId}`);
          errorCount++;
          continue;
        }

        console.log(`🤖 Generating video summary for ${material.videoId}...`);

        // Generate learning materials (which includes videoSummary)
        const materials = await generateLearningMaterials(transcriptText);

        // Update the learning material with videoSummary
        await LearningMaterial.findByIdAndUpdate(material._id, {
          videoSummary: materials.videoSummary
        });

        console.log(`✅ Updated video summary for ${material.videoId}`);
        successCount++;

        // Small delay to avoid overwhelming the LLM API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing video ${material.videoId}:`, error);
        errorCount++;
      }
    }

    console.log(`🎉 Migration completed!`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Run the migration
migrateVideoSummaries().catch(console.error);