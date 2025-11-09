/**
 * Fix Harshil's user document:
 * 1. Copy Tim's general preferences to Harshil
 * 2. Remove deprecated/dummy fields from Harshil's preferences
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://harshil30:chgeldo4gvx7tuDF@ecommerce-cluster.w7f0wrp.mongodb.net/clarity-ai";

async function fixHarshilDocument() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔄 Connecting to MongoDB...\n');
    await client.connect();
    console.log('✅ Connected!\n');

    const db = client.db('clarity-ai');
    const usersCollection = db.collection('users');

    // Get Tim's document to copy general preferences
    const tim = await usersCollection.findOne({ email: 'tim@apple.com' });
    if (!tim) {
      console.error('❌ Could not find Tim\'s document');
      return;
    }

    console.log('📋 Tim\'s general preferences:', JSON.stringify(tim.preferences?.general, null, 2), '\n');

    // Update Harshil's document
    const result = await usersCollection.updateOne(
      { email: 'harshil@gmail.com' },
      {
        $set: {
          // Copy Tim's general preferences
          'preferences.general': tim.preferences?.general || {
            emailNotifications: true,
            studyReminders: true,
            autoplayVideos: false,
          }
        },
        $unset: {
          // Remove all deprecated/dummy fields
          'preferences.accessibility': '',
          'preferences.timePreferences': '',
          'preferences.additionalPreferences': '',
          'preferences.learningGoals': '',
          'preferences.subjects': '',
          'preferences.learningStyle': '',
          'preferences.preferredContentTypes': '',
        }
      }
    );

    console.log(`✅ Modified ${result.modifiedCount} document(s)\n`);

    // Verify the update
    const harshil = await usersCollection.findOne(
      { email: 'harshil@gmail.com' },
      { projection: { preferences: 1 } }
    );

    console.log('📊 Harshil\'s updated preferences structure:');
    console.log(JSON.stringify(harshil?.preferences, null, 2), '\n');

    console.log('✨ Cleanup complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Connection closed\n');
  }
}

fixHarshilDocument();
