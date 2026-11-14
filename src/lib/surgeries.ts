import { supabase } from './supabase';
import { surgeryToRow } from './mappers';
import type { SurgeryEvent } from '../types';

export async function addSurgery(patientUhid: string, surgery: SurgeryEvent): Promise<void> {
  const { error } = await supabase.from('surgeries').insert(surgeryToRow(patientUhid, surgery));
  if (error) throw error;
}

/** Appends a timestamped entry to a surgery's operative notes. */
export async function appendSurgeryNotes(
  surgeryId: string,
  existing: string | undefined,
  entry: string,
): Promise<void> {
  const otNotes = existing ? `${existing}\n\n${entry}` : entry;
  const { error } = await supabase.from('surgeries').update({ ot_notes: otNotes }).eq('id', surgeryId);
  if (error) throw error;
}
