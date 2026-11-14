import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { mapStudyGroup, type StudyGroupRow } from '../mappers';
import type { StudyGroup } from '../../types';

export interface UseStudyGroupsReturn {
  studyGroups: StudyGroup[];
  loading: boolean;
  error: string | null;
  createGroup: (name: string, description: string) => Promise<string>;
  updateGroup: (id: string, name: string, description: string) => Promise<void>;
  enrollPatient: (studyGroupId: string, patientUhid: string) => Promise<void>;
  unenrollPatient: (studyGroupId: string, patientUhid: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useStudyGroups(authUserId: string | null): UseStudyGroupsReturn {
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('study_groups')
      .select('*, patient_count:study_group_patients(count)')
      .order('created_at', { ascending: false });
    setError(fetchError ? fetchError.message : null);
    if (!fetchError) setStudyGroups(((data ?? []) as StudyGroupRow[]).map(mapStudyGroup));
    setLoading(false);
  }, []);

  // State is scoped to the signed-in user; the owning component remounts on sign-out.
  useEffect(() => {
    // setState only runs after the awaited request resolves, not synchronously in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authUserId) void fetchGroups();
  }, [authUserId, fetchGroups]);

  const createGroup = async (name: string, description: string) => {
    const { data, error: e } = await supabase.from('study_groups').insert({ name, description }).select('id').single();
    if (e) throw e;
    await fetchGroups();
    return (data as { id: string }).id;
  };

  const updateGroup = async (id: string, name: string, description: string) => {
    const { error: e } = await supabase.from('study_groups').update({ name, description }).eq('id', id);
    if (e) throw e;
    await fetchGroups();
  };

  const enrollPatient = async (studyGroupId: string, patientUhid: string) => {
    const { error: e } = await supabase
      .from('study_group_patients')
      .insert({ study_group_id: studyGroupId, patient_uhid: patientUhid });
    if (e) {
      if (e.code === '23505') throw new Error('This patient is already enrolled in the group.');
      throw e;
    }
    await fetchGroups();
  };

  const unenrollPatient = async (studyGroupId: string, patientUhid: string) => {
    const { error: e } = await supabase
      .from('study_group_patients')
      .delete()
      .eq('study_group_id', studyGroupId)
      .eq('patient_uhid', patientUhid);
    if (e) throw e;
    await fetchGroups();
  };

  return {
    studyGroups,
    loading,
    error,
    createGroup,
    updateGroup,
    enrollPatient,
    unenrollPatient,
    refetch: fetchGroups,
  };
}
