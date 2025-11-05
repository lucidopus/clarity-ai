/**
 * Database Initialization Script
 * Run this script once to create indexes for the chats collection
 *
 * Usage:
 * npx tsx scripts/init-chat-indexes.ts
 */

import { createChatIndexes } from '../lib/chat-db';

async function main() {
  console.log('🚀 Starting chat indexes initialization...\n');

  try {
    await createChatIndexes();
    console.log('✅ Chat indexes created successfully!');
    console.log('\nIndexes created:');
    console.log('  1. Compound index: sessionId + role + timestamp');
    console.log('  2. TTL index: timestamp (auto-delete after 30 days)');
    console.log('\n✨ Database is ready for chat storage!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create chat indexes:', error);
    process.exit(1);
  }
}

main();
