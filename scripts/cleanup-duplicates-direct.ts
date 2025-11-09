/**
 * Direct MongoDB migration to remove duplicate generalPreferences field
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://harshil30:chgeldo4gvx7tuDF@ecommerce-cluster.w7f0wrp.mongodb.net/clarity-ai";

async function cleanupDuplicates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔄 Connecting to MongoDB...\n');
    await client.connect();
    console.log('✅ Connected!\n');

    const db = client.db('clarity-ai');
    const usersCollection = db.collection('users');

    // Count users with duplicate field
    const countBefore = await usersCollection.countDocuments({
      'preferences.generalPreferences': { $exists: true }
    });
    console.log(`📊 Found ${countBefore} users with duplicate generalPreferences field\n`);

    if (countBefore === 0) {
      console.log('✨ No cleanup needed!\n');
      return;
    }

    // Remove the duplicate field
    const result = await usersCollection.updateMany(
      { 'preferences.generalPreferences': { $exists: true } },
      { $unset: { 'preferences.generalPreferences': '' } }
    );

    console.log(`✅ Modified ${result.modifiedCount} users\n`);

    // Verify cleanup
    const countAfter = await usersCollection.countDocuments({
      'preferences.generalPreferences': { $exists: true }
    });

    if (countAfter === 0) {
      console.log('✨ Cleanup complete! All duplicate fields removed.\n');
    } else {
      console.warn(`⚠️  Warning: ${countAfter} users still have the duplicate field\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Connection closed\n');
  }
}

cleanupDuplicates();
