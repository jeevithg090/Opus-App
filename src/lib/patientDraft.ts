import { createId } from './clinical';
import type { Gender, Patient, SurgeryEvent } from '../types';

/** Raw values from the "new patient" form. */
export interface PatientDraft {
  uhid: string;
  name: string;
  ageYears: string;
  gender: Gender;
  diagnosis: string;
  primarySurgeon: string;
  dateOfSurgery: string;
}

export const GENDERS: Gender[] = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const emptyPatientDraft = (surgeon: string): PatientDraft => ({
  uhid: '',
  name: '',
  ageYears: '',
  gender: 'Male',
  diagnosis: '',
  primarySurgeon: surgeon,
  dateOfSurgery: '',
});

/** Converts the form draft into a Patient, adding a "Primary Surgery" when a date is given. */
export function draftToPatient(draft: PatientDraft, now: Date = new Date()): Patient {
  const surgeries: SurgeryEvent[] = draft.dateOfSurgery
    ? [{ id: createId('surg'), title: 'Primary Surgery', date: draft.dateOfSurgery }]
    : [];
  return {
    uhid: draft.uhid.trim(),
    name: draft.name.trim(),
    ageYears: Math.max(0, Math.floor(Number(draft.ageYears) || 0)),
    gender: draft.gender,
    diagnosis: draft.diagnosis.trim(),
    primarySurgeon: draft.primarySurgeon.trim(),
    studyGroupIds: [],
    createdAt: now.toISOString(),
    dateOfSurgery: draft.dateOfSurgery || undefined,
    surgeries,
  };
}
