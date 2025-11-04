import mongoose, { Schema } from 'mongoose';
import dbConnect from '../lib/mongodb';

// Define the old note schema for migration
interface IOldNote {
  userId: mongoose.Types.ObjectId;
  videoId: string;
  segmentId?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const OldNoteSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: String, required: true },
  segmentId: { type: String },
  content: { type: String, default: '' },
}, {
  timestamps: true,
  collection: 'notes',
});

const OldNote = mongoose.models.OldNote || mongoose.model<IOldNote>('OldNote', OldNoteSchema);

interface INewNote {
  userId: mongoose.Types.ObjectId;
  videoId: string;
  generalNote: string;
  segmentNotes: Array<{
    segmentId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

async function migrateNotes() {
  try {
    await dbConnect();

    console.log('\n========================================');
    console.log('Starting Notes Migration');
    console.log('========================================\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Fetch all old notes
    const oldNotes = await OldNote.find({});
    console.log(`📊 Found ${oldNotes.length} old notes to migrate`);

    if (oldNotes.length === 0) {
      console.log('✅ No notes to migrate.');
      await mongoose.connection.close();
      return;
    }

    // Group notes by userId and videoId
    let multipleGeneralNotesCount = 0;
    const groupedNotes = oldNotes.reduce((acc, note) => {
      const key = `${note.userId}-${note.videoId}`;
      if (!acc[key]) {
        acc[key] = {
          userId: note.userId,
          videoId: note.videoId,
          generalNote: '',
          segmentNotes: [],
          // Use earliest createdAt and latest updatedAt across all notes for this video
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        };
      }

      // Update timestamps to get earliest created and latest updated
      if (note.createdAt < acc[key].createdAt) {
        acc[key].createdAt = note.createdAt;
      }
      if (note.updatedAt > acc[key].updatedAt) {
        acc[key].updatedAt = note.updatedAt;
      }

      if (note.segmentId) {
        // This is a segment note
        acc[key].segmentNotes.push({
          segmentId: note.segmentId,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        });
      } else {
        // This is a general note
        if (acc[key].generalNote !== '') {
          console.warn(`⚠️  Multiple general notes for userId=${note.userId}, videoId=${note.videoId}`);
          console.warn(`   Merging notes with separator...`);
          multipleGeneralNotesCount++;
          acc[key].generalNote += '\n\n---\n\n' + note.content;
        } else {
          acc[key].generalNote = note.content;
        }
      }

      return acc;
    }, {} as Record<string, INewNote>);

    const newNotes: INewNote[] = Object.values(groupedNotes);
    console.log(`\n📝 Created ${newNotes.length} new note documents`);
    console.log(`   - General notes with content: ${newNotes.filter(n => n.generalNote !== '').length}`);
    console.log(`   - Total segment notes: ${newNotes.reduce((sum, n) => sum + n.segmentNotes.length, 0)}`);

    if (multipleGeneralNotesCount > 0) {
      console.warn(`   ⚠️  Merged ${multipleGeneralNotesCount} cases of multiple general notes`);
    }

    // Drop notes_new if it exists (clear previous migration attempts)
    const tempCollection = 'notes_new';
    const collections = await db.listCollections({ name: tempCollection }).toArray();
    if (collections.length > 0) {
      console.log(`\n🗑️  Dropping existing '${tempCollection}' collection...`);
      await db.collection(tempCollection).drop();
    }

    // Insert into temporary collection
    console.log(`\n💾 Inserting ${newNotes.length} documents into '${tempCollection}'...`);
    await db.collection(tempCollection).insertMany(newNotes);
    console.log(`✅ Inserted successfully`);

    // Create unique index
    console.log(`\n🔐 Creating unique index on {videoId: 1, userId: 1}...`);
    await db.collection(tempCollection).createIndex(
      { videoId: 1, userId: 1 },
      { unique: true }
    );
    console.log(`✅ Index created successfully`);

    // Verify the migration
    console.log(`\n🔍 Verifying migration...`);
    const verifyCount = await db.collection(tempCollection).countDocuments();
    console.log(`   - Documents in ${tempCollection}: ${verifyCount}`);

    const indexes = await db.collection(tempCollection).indexes();
    console.log(`   - Indexes: ${indexes.map(idx => JSON.stringify(idx.key)).join(', ')}`);

    console.log('\n========================================');
    console.log('Migration Complete - Manual Steps Required');
    console.log('========================================\n');
    console.log('✅ Data migrated to temporary collection: notes_new');
    console.log('✅ Unique index created');
    console.log('\n📋 Next Steps (Manual Verification Required):');
    console.log('1. Verify data in notes_new collection');
    console.log('2. Once verified, run these commands in MongoDB shell:');
    console.log('   > use clarity-ai');
    console.log('   > db.notes.renameCollection("notes_old")');
    console.log('   > db.notes_new.renameCollection("notes")');
    console.log('\n🔄 Rollback Plan (if needed):');
    console.log('   > db.notes_new.drop()');
    console.log('   > db.notes_old.renameCollection("notes")');
    console.log('\n========================================\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    // Always close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the migration
migrateNotes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
