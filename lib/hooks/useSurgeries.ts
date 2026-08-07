import { supabase } from '../supabase';
import type { SurgeryEvent } from '../../types';

interface UseSurgeriesReturn {
  addSurgery: (patientUhid: string, surgery: SurgeryEvent) => Promise<void>;
}

export function useSurgeries(): UseSurgeriesReturn {
  const addSurgery = async (patientUhid: string, surgery: SurgeryEvent) => {
    await supabase.from('surgeries').insert({
      id: surgery.id,
      patient_uhid: patientUhid,
      title: surgery.title,
      date: surgery.date,
      notes: surgery.notes ?? null,
      ot_notes: surgery.otNotes ?? null,
      finding_url: surgery.findingUrl ?? null,
    });
  };

  return { addSurgery };
}
