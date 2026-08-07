import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { mapMediaEntry } from '../mappers';
import type { MediaEntry, StorageLocation } from '../../types';

interface UseMediaReturn {
  media: MediaEntry[];
  loading: boolean;
  addMedia: (entry: Omit<MediaEntry, 'id'>) => Promise<void>;
  syncMedia: (uhid: string, targetLocation: StorageLocation) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useMedia(): UseMediaReturn {
  const [media, setMedia] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const { data } = await supabase
      .from('media_entries')
      .select('*')
      .order('uploaded_at', { ascending: false });

    setMedia((data ?? []).map(mapMediaEntry));
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia(true);
  }, []);

  const addMedia = async (entry: Omit<MediaEntry, 'id'>) => {
    const { error } = await supabase.from('media_entries').insert({
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
    });
    if (error) throw error;
    await fetchMedia();
  };

  const syncMedia = async (uhid: string, targetLocation: StorageLocation) => {
    await supabase
      .from('media_entries')
      .update({ storage_location: targetLocation })
      .eq('patient_uhid', uhid);
    await fetchMedia();
  };

  return { media, loading, addMedia, syncMedia, refetch: fetchMedia };
}
