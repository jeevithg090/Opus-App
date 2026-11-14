import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { mapMediaEntry, type MediaRow } from '../mappers';
import { resolveMediaUrls } from '../storage';
import { createId } from '../clinical';
import type { MediaEntry, StorageLocation } from '../../types';

export type NewMediaEntry = Omit<MediaEntry, 'id'>;

export interface UseMediaReturn {
  media: MediaEntry[];
  loading: boolean;
  error: string | null;
  addMedia: (entries: NewMediaEntry[]) => Promise<void>;
  syncMedia: (uhid: string, targetLocation: StorageLocation) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Media rows store the storage object key (or a legacy public URL); the `url`
 * exposed to the UI is always a short-lived signed URL for the private bucket.
 */
export function useMedia(authUserId: string | null): UseMediaReturn {
  const [media, setMedia] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('media_entries')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    const entries = ((data ?? []) as MediaRow[]).map(mapMediaEntry);
    const urls = await resolveMediaUrls(entries.flatMap((m) => (m.thumbnailUrl ? [m.url, m.thumbnailUrl] : [m.url])));
    setMedia(
      entries.map((m) => ({
        ...m,
        url: urls.get(m.url) ?? m.url,
        thumbnailUrl: m.thumbnailUrl ? (urls.get(m.thumbnailUrl) ?? m.thumbnailUrl) : undefined,
      })),
    );
    setError(null);
    setLoading(false);
  }, []);

  // State is scoped to the signed-in user; the owning component remounts on sign-out.
  useEffect(() => {
    // setState only runs after the awaited request resolves, not synchronously in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authUserId) void fetchMedia();
  }, [authUserId, fetchMedia]);

  const addMedia = async (entries: NewMediaEntry[]) => {
    if (entries.length === 0) return;
    const { error: insertError } = await supabase.from('media_entries').insert(
      entries.map((entry) => ({
        id: createId('media'),
        patient_uhid: entry.uhid,
        surgery_id: entry.surgeryId || null,
        stage: entry.stage,
        type: entry.type,
        url: entry.url,
        thumbnail_url: entry.thumbnailUrl ?? null,
        uploaded_at: entry.uploadedAt,
        notes: entry.notes ?? null,
        tags: entry.tags,
        storage_location: entry.storageLocation,
      })),
    );
    if (insertError) throw insertError;
    await fetchMedia();
  };

  const syncMedia = async (uhid: string, targetLocation: StorageLocation) => {
    const { error: updateError } = await supabase
      .from('media_entries')
      .update({ storage_location: targetLocation })
      .eq('patient_uhid', uhid);
    if (updateError) throw updateError;
    await fetchMedia();
  };

  return { media, loading, error, addMedia, syncMedia, refetch: fetchMedia };
}
