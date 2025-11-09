/**
 * One-time migration script to remove duplicate generalPreferences field
 *
 * This script removes the `preferences.generalPreferences` field from all users,
 * keeping only `preferences.general` for consistency.
 *
 * Run with: npx tsx scripts/cleanup-general-preferences.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

async function cleanupGeneralPreferences() {
  console.log('🔄 Starting cleanup of duplicate generalPreferences field...\n');

  try {
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    // Find all users with the duplicate generalPreferences field
    const usersWithDuplicate = await User.find({
      'preferences.generalPreferences': { $exists: true }
    });

    console.log(`📊 Found ${usersWithDuplicate.length} users with duplicate generalPreferences field\n`);

    if (usersWithDuplicate.length === 0) {
      console.log('✨ No cleanup needed - all users are already clean!\n');
      process.exit(0);
    }

    // Update all users to remove the duplicate field
    const result = await User.updateMany(
      { 'preferences.generalPreferences': { $exists: true } },
      {
        $unset: {
          'preferences.generalPreferences': ''
        }
      }
    );

    console.log(`✅ Successfully cleaned up ${result.modifiedCount} users\n`);

    // Verify cleanup
    const remainingDuplicates = await User.countDocuments({
      'preferences.generalPreferences': { $exists: true }
    });

    if (remainingDuplicates === 0) {
      console.log('✨ Cleanup complete! All duplicate fields have been removed.\n');
    } else {
      console.warn(`⚠️  Warning: ${remainingDuplicates} users still have the duplicate field\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupGeneralPreferences();
