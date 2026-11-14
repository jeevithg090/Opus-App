import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { mapPatient, patientToRow, surgeryToRow, type PatientRow } from '../mappers';
import type { Patient } from '../../types';

const PATIENT_SELECT = '*, surgeries(*), study_groups:study_group_patients(study_group_id)';

export interface UsePatientsReturn {
  patients: Patient[];
  deletedPatients: Patient[];
  loading: boolean;
  error: string | null;
  addPatient: (p: Patient) => Promise<void>;
  updatePatient: (p: Patient) => Promise<void>;
  softDelete: (uhid: string) => Promise<void>;
  hardDelete: (uhid: string) => Promise<void>;
  restore: (uhid: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePatients(authUserId: string | null): UsePatientsReturn {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [deletedPatients, setDeletedPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    const [active, deleted] = await Promise.all([
      supabase.from('patients').select(PATIENT_SELECT).is('deleted_at', null).order('created_at', { ascending: false }),
      supabase
        .from('patients')
        .select(PATIENT_SELECT)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
    ]);
    const failure = active.error ?? deleted.error;
    setError(failure ? failure.message : null);
    if (!failure) {
      setPatients(((active.data ?? []) as PatientRow[]).map(mapPatient));
      setDeletedPatients(((deleted.data ?? []) as PatientRow[]).map(mapPatient));
    }
    setLoading(false);
  }, []);

  // State is scoped to the signed-in user; the owning component remounts on sign-out.
  useEffect(() => {
    // setState only runs after the awaited request resolves, not synchronously in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authUserId) void fetchPatients();
  }, [authUserId, fetchPatients]);

  const addPatient = async (p: Patient) => {
    const { error: patientError } = await supabase
      .from('patients')
      .insert({ ...patientToRow(p), created_at: p.createdAt });
    if (patientError) {
      if (patientError.code === '23505') throw new Error(`A patient with UHID "${p.uhid}" already exists.`);
      throw patientError;
    }

    if (p.surgeries.length > 0) {
      const { error: surgeryError } = await supabase
        .from('surgeries')
        .insert(p.surgeries.map((s) => surgeryToRow(p.uhid, s)));
      if (surgeryError) {
        await fetchPatients();
        throw new Error(`Patient saved, but the surgery record failed: ${surgeryError.message}`);
      }
    }
    await fetchPatients();
  };

  const updatePatient = async (p: Patient) => {
    const { uhid, ...changes } = patientToRow(p);
    const { error: updateError } = await supabase.from('patients').update(changes).eq('uhid', uhid);
    if (updateError) throw updateError;
    await fetchPatients();
  };

  const softDelete = async (uhid: string) => {
    const { error: e } = await supabase
      .from('patients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('uhid', uhid);
    if (e) throw e;
    await fetchPatients();
  };

  const hardDelete = async (uhid: string) => {
    const { error: e } = await supabase.from('patients').delete().eq('uhid', uhid);
    if (e) throw e;
    await fetchPatients();
  };

  const restore = async (uhid: string) => {
    const { error: e } = await supabase.from('patients').update({ deleted_at: null }).eq('uhid', uhid);
    if (e) throw e;
    await fetchPatients();
  };

  return {
    patients,
    deletedPatients,
    loading,
    error,
    addPatient,
    updatePatient,
    softDelete,
    hardDelete,
    restore,
    refetch: fetchPatients,
  };
}
