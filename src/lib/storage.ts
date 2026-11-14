import { supabase, MEDIA_BUCKET } from './supabase';
import { buildStoragePath, extractStoragePath } from './clinical';

/** Signed URL lifetime. Long enough for a working session, short enough to limit link sharing. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Uploads a file to the private media bucket and returns its object key. */
export async function uploadMediaFile(
  userId: string,
  uhid: string,
  file: File,
  index: number,
  timestamp: number = Date.now(),
): Promise<string> {
  const path = buildStoragePath(userId, uhid, timestamp, index, file.name);
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Best-effort removal of uploaded objects (used to roll back a failed intake). */
export async function removeMediaFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) console.warn('Failed to clean up uploaded media:', error.message);
}

/**
 * Resolves stored media references (object keys or legacy public URLs) to
 * short-lived signed URLs. References that cannot be signed are returned unchanged.
 */
export async function resolveMediaUrls(refs: string[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const pathByRef = new Map<string, string>();
  for (const ref of refs) {
    const path = extractStoragePath(ref, MEDIA_BUCKET);
    if (path) pathByRef.set(ref, path);
    else resolved.set(ref, ref);
  }

  const paths = [...new Set(pathByRef.values())];
  if (paths.length === 0) return resolved;

  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const signedByPath = new Map<string, string>();
  if (error) {
    console.warn('Could not sign media URLs:', error.message);
  } else {
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
    }
  }

  for (const [ref, path] of pathByRef) {
    resolved.set(ref, signedByPath.get(path) ?? ref);
  }
  return resolved;
}
