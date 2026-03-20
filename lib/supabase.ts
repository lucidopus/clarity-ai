import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const UPLOADS_BUCKET = 'uploads';

let _supabase: SupabaseClient | null = null;

/**
 * Returns the Supabase client for server-side file uploads.
 * Throws a clear error if env vars are missing (at call time, not import time).
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
      );
    }

    _supabase = createClient(url, key);
  }
  return _supabase;
}

/**
 * Extracts the storage path from a Supabase public URL.
 * URL format: https://<project>.supabase.co/storage/v1/object/public/uploads/<userId>/<fileId>.<ext>
 * Returns the path after the bucket name, e.g. "<userId>/<fileId>.<ext>"
 */
function extractStoragePath(fileUrl: string): string | null {
  const marker = `/storage/v1/object/public/${UPLOADS_BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.slice(idx + marker.length);
}

/**
 * Deletes uploaded files from Supabase Storage given their public URLs.
 * Silently skips invalid URLs and logs errors without throwing.
 */
export async function deleteSupabaseFiles(fileUrls: string[]): Promise<void> {
  const paths = fileUrls
    .map(extractStoragePath)
    .filter((p): p is string => p !== null);

  if (paths.length === 0) return;

  try {
    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .remove(paths);

    if (error) {
      console.error('⚠️ [SUPABASE] Failed to delete files:', error.message, { paths });
    } else {
      console.log(`🗑️ [SUPABASE] Deleted ${paths.length} file(s) from storage`);
    }
  } catch (err) {
    // Don't fail the delete operation if Supabase cleanup fails
    console.error('⚠️ [SUPABASE] Storage cleanup error:', err instanceof Error ? err.message : err);
  }
}
