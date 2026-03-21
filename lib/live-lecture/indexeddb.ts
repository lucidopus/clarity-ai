/**
 * IndexedDB wrapper for live lecture crash recovery (Layer 2).
 *
 * Stores transcript segments, focus notes, importance markers, and active session
 * metadata locally so that a page refresh or crash doesn't lose lecture data.
 */

const DB_NAME = 'clarity-live-lecture';
const DB_VERSION = 1;

// Store names
const SEGMENTS_STORE = 'segments';
const SESSION_STORE = 'session';

export interface StoredSegment {
  id?: number; // auto-increment
  sessionId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  committedAt: string; // ISO string
  synced: boolean; // whether this segment has been synced to MongoDB
}

export interface StoredSession {
  sessionId: string;
  title: string;
  audioSource: 'mic' | 'system';
  startedAt: string;
  focusNotes: string;
  importanceMarkers: Array<{
    offsetSeconds: number;
    notePosition?: number;
    createdAt: string;
  }>;
  contextDocIds: string[];
  token: string; // ElevenLabs token (for reconnection within 15min window)
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(SEGMENTS_STORE)) {
        const segStore = db.createObjectStore(SEGMENTS_STORE, { keyPath: 'id', autoIncrement: true });
        segStore.createIndex('sessionId', 'sessionId', { unique: false });
        segStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'sessionId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Segments ──────────────────────────────────────────────────────────────

export async function saveSegment(segment: Omit<StoredSegment, 'id'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SEGMENTS_STORE, 'readwrite');
    tx.objectStore(SEGMENTS_STORE).add(segment);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getSegments(sessionId: string): Promise<StoredSegment[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SEGMENTS_STORE, 'readonly');
    const index = tx.objectStore(SEGMENTS_STORE).index('sessionId');
    const request = index.getAll(sessionId);
    request.onsuccess = () => { db.close(); resolve(request.result); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function getUnsyncedSegments(sessionId: string): Promise<StoredSegment[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SEGMENTS_STORE, 'readonly');
    const store = tx.objectStore(SEGMENTS_STORE);
    const results: StoredSegment[] = [];

    const request = store.index('sessionId').openCursor(sessionId);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if (!cursor.value.synced) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        db.close();
        resolve(results);
      }
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function markSegmentsSynced(segmentIds: number[]): Promise<void> {
  if (segmentIds.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SEGMENTS_STORE, 'readwrite');
    const store = tx.objectStore(SEGMENTS_STORE);

    for (const id of segmentIds) {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.synced = true;
          store.put(record);
        }
      };
    }

    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ─── Session ───────────────────────────────────────────────────────────────

export async function saveActiveSession(session: StoredSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readwrite');
    tx.objectStore(SESSION_STORE).put(session);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getActiveSession(): Promise<StoredSession | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readonly');
    const request = tx.objectStore(SESSION_STORE).getAll();
    request.onsuccess = () => {
      db.close();
      // Return the first (and should be only) active session
      resolve(request.result.length > 0 ? request.result[0] : null);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function updateSessionNotes(sessionId: string, focusNotes: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readwrite');
    const store = tx.objectStore(SESSION_STORE);
    const request = store.get(sessionId);

    request.onsuccess = () => {
      const session = request.result;
      if (session) {
        session.focusNotes = focusNotes;
        store.put(session);
      }
    };

    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function addMarkerToSession(
  sessionId: string,
  marker: { offsetSeconds: number; notePosition?: number; createdAt: string }
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readwrite');
    const store = tx.objectStore(SESSION_STORE);
    const request = store.get(sessionId);

    request.onsuccess = () => {
      const session = request.result;
      if (session) {
        session.importanceMarkers = session.importanceMarkers || [];
        session.importanceMarkers.push(marker);
        store.put(session);
      }
    };

    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ─── Cleanup ───────────────────────────────────────────────────────────────

export async function clearSession(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SEGMENTS_STORE, SESSION_STORE], 'readwrite');

    // Delete session
    tx.objectStore(SESSION_STORE).delete(sessionId);

    // Delete all segments for this session
    const segStore = tx.objectStore(SEGMENTS_STORE);
    const index = segStore.index('sessionId');
    const request = index.openCursor(sessionId);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        segStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
