import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { mapStudyGroup } from '../mappers';
import type { StudyGroup } from '../../types';

interface UseStudyGroupsReturn {
  studyGroups: StudyGroup[];
  loading: boolean;
  createGroup: (name: string, description: string) => Promise<string>;
  updateGroup: (id: string, name: string, description: string) => Promise<void>;
  enrollPatient: (studyGroupId: string, patientUhid: string) => Promise<void>;
  unenrollPatient: (studyGroupId: string, patientUhid: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useStudyGroups(): UseStudyGroupsReturn {
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const { data } = await supabase
      .from('study_groups')
      .select('*, patient_count:study_group_patients(count)')
      .order('created_at', { ascending: false });

    const mapped = (data ?? []).map((row: any) => ({
      ...mapStudyGroup(row),
      patientCount: row.patient_count?.[0]?.count ?? 0,
    }));
    setStudyGroups(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups(true);
  }, []);

  const createGroup = async (name: string, description: string) => {
    const { data } = await supabase
      .from('study_groups')
      .insert({ name, description })
      .select('id')
      .single();
    await fetchGroups();
    return data?.id ?? '';
  };

  const updateGroup = async (id: string, name: string, description: string) => {
    await supabase.from('study_groups').update({ name, description }).eq('id', id);
    await fetchGroups();
  };

  const enrollPatient = async (studyGroupId: string, patientUhid: string) => {
    await supabase.from('study_group_patients').insert({
      study_group_id: studyGroupId,
      patient_uhid: patientUhid,
    });
    await fetchGroups();
  };

  const unenrollPatient = async (studyGroupId: string, patientUhid: string) => {
    await supabase.from('study_group_patients')
      .delete()
      .eq('study_group_id', studyGroupId)
      .eq('patient_uhid', patientUhid);
    await fetchGroups();
  };

  return { studyGroups, loading, createGroup, updateGroup, enrollPatient, unenrollPatient, refetch: fetchGroups };
}
