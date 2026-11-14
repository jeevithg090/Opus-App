import { createId, todayIsoDate } from './clinical';
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

export type PatientDraftErrors = Partial<Record<keyof PatientDraft, string>>;

/** Friendly, field-level validation for the new-patient form. Returns an empty object when valid. */
export function validatePatientDraft(draft: PatientDraft, today: string = todayIsoDate()) {
  const errors: PatientDraftErrors = {};
  if (!draft.uhid.trim()) errors.uhid = 'Enter the hospital ID (UHID) for this patient.';
  else if (draft.uhid.trim().length > 64) errors.uhid = 'UHID must be 64 characters or fewer.';
  if (!draft.name.trim()) errors.name = "Enter the patient's name.";
  if (draft.ageYears !== '') {
    const age = Number(draft.ageYears);
    if (!Number.isFinite(age) || age < 0 || age > 130) errors.ageYears = 'Age must be between 0 and 130.';
  }
  if (draft.dateOfSurgery && draft.dateOfSurgery > today)
    errors.dateOfSurgery = 'Surgery date cannot be in the future.';
  if (!draft.diagnosis.trim()) errors.diagnosis = 'Add a short clinical diagnosis.';
  return errors;
}
