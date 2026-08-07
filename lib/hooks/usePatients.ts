import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { mapPatient, mapSurgery } from '../mappers';
import type { Patient } from '../../types';

interface UsePatientsReturn {
  patients: Patient[];
  deletedPatients: Patient[];
  loading: boolean;
  addPatient: (p: Patient) => Promise<void>;
  updatePatient: (p: Patient) => Promise<void>;
  softDelete: (uhid: string) => Promise<void>;
  hardDelete: (uhid: string) => Promise<void>;
  restore: (uhid: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePatients(): UsePatientsReturn {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [deletedPatients, setDeletedPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const { data: active } = await supabase
      .from('patients')
      .select('*, surgeries(*), study_groups:study_group_patients(study_group_id)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const { data: deleted } = await supabase
      .from('patients')
      .select('*, surgeries(*), study_groups:study_group_patients(study_group_id)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    setPatients((active ?? []).map(mapPatient));
    setDeletedPatients((deleted ?? []).map(mapPatient));
    setLoading(false);
  };

  useEffect(() => {
    fetchPatients(true);
  }, []);

  const addPatient = async (p: Patient) => {
    const { error: patientError } = await supabase.from('patients').insert({
      uhid: p.uhid,
      name: p.name,
      age_years: p.ageYears,
      age_months: p.ageMonths ?? null,
      gender: p.gender,
      diagnosis: p.diagnosis,
      primary_surgeon: p.primarySurgeon,
      created_at: p.createdAt,
      date_of_surgery: p.dateOfSurgery ?? null,
    });
    if (patientError) {
      console.error('Patient insert failed:', patientError);
      throw patientError;
    }

    for (const surgery of p.surgeries) {
      const { error: surgeryError } = await supabase.from('surgeries').insert({
        id: surgery.id,
        patient_uhid: p.uhid,
        title: surgery.title,
        date: surgery.date,
        notes: surgery.notes ?? null,
        ot_notes: surgery.otNotes ?? null,
        finding_url: surgery.findingUrl ?? null,
      });
      if (surgeryError) {
        console.error('Surgery insert failed:', surgeryError);
      }
    }
    await fetchPatients();
  };

  const updatePatient = async (p: Patient) => {
    await supabase.from('patients').upsert({
      uhid: p.uhid,
      name: p.name,
      age_years: p.ageYears,
      age_months: p.ageMonths ?? null,
      gender: p.gender,
      diagnosis: p.diagnosis,
      primary_surgeon: p.primarySurgeon,
    });
    await fetchPatients();
  };

  const softDelete = async (uhid: string) => {
    await supabase.from('patients').update({ deleted_at: new Date().toISOString() }).eq('uhid', uhid);
    await fetchPatients();
  };

  const hardDelete = async (uhid: string) => {
    await supabase.from('patients').delete().eq('uhid', uhid);
    await fetchPatients();
  };

  const restore = async (uhid: string) => {
    await supabase.from('patients').update({ deleted_at: null }).eq('uhid', uhid);
    await fetchPatients();
  };

  return { patients, deletedPatients, loading, addPatient, updatePatient, softDelete, hardDelete, restore, refetch: fetchPatients };
}
