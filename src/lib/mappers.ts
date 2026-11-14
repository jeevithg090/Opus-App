import type {
  AuditEntry,
  AuthUser,
  Gender,
  MediaEntry,
  MediaType,
  Patient,
  StorageLocation,
  StudyGroup,
  SurgeryEvent,
  SurgicalStage,
} from '../types';

/** Row shapes as returned by PostgREST (snake_case columns). */
export interface SurgeryRow {
  id: string;
  patient_uhid?: string | null;
  title: string;
  date: string;
  notes?: string | null;
  ot_notes?: string | null;
  finding_url?: string | null;
}

export interface MediaRow {
  id: string;
  patient_uhid: string;
  surgery_id?: string | null;
  stage: string;
  type: string;
  url: string;
  thumbnail_url?: string | null;
  uploaded_at: string;
  notes?: string | null;
  tags?: string[] | null;
  storage_location: string;
}

export interface PatientRow {
  uhid: string;
  name: string;
  age_years: number;
  age_months?: number | null;
  gender: string;
  diagnosis: string;
  primary_surgeon: string;
  created_at: string;
  date_of_surgery?: string | null;
  deleted_at?: string | null;
  surgeries?: SurgeryRow[] | null;
  study_groups?: { study_group_id: string }[] | null;
}

export interface StudyGroupRow {
  id: string;
  name: string;
  description: string;
  drive_folder_id?: string | null;
  last_sync?: string | null;
  /** Aggregate from `patient_count:study_group_patients(count)`. */
  patient_count?: { count: number }[] | number | null;
}

export interface AuditRow {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  target_id: string;
  details: string;
  timestamp: string;
}

export interface ProfileRow {
  id: string;
  name: string;
  role: string;
  email: string;
}

const ROLES: AuthUser['role'][] = ['Surgeon', 'Fellow', 'Researcher'];

export function mapSurgery(db: SurgeryRow): SurgeryEvent {
  return {
    id: db.id,
    title: db.title,
    date: db.date,
    notes: db.notes ?? undefined,
    otNotes: db.ot_notes ?? undefined,
    findingUrl: db.finding_url ?? undefined,
  };
}

export function mapMediaEntry(db: MediaRow): MediaEntry {
  return {
    id: db.id,
    uhid: db.patient_uhid,
    surgeryId: db.surgery_id ?? '',
    stage: db.stage as SurgicalStage,
    type: db.type as MediaType,
    url: db.url,
    thumbnailUrl: db.thumbnail_url ?? undefined,
    uploadedAt: db.uploaded_at,
    notes: db.notes ?? undefined,
    tags: db.tags ?? [],
    storageLocation: db.storage_location as StorageLocation,
  };
}

export function mapPatient(db: PatientRow): Patient {
  return {
    uhid: db.uhid,
    name: db.name,
    ageYears: db.age_years,
    ageMonths: db.age_months ?? undefined,
    gender: db.gender as Gender,
    diagnosis: db.diagnosis,
    primarySurgeon: db.primary_surgeon,
    studyGroupIds: db.study_groups?.map((s) => s.study_group_id) ?? [],
    createdAt: db.created_at,
    dateOfSurgery: db.date_of_surgery ?? undefined,
    deletedAt: db.deleted_at ?? undefined,
    surgeries: (db.surgeries ?? []).map(mapSurgery),
  };
}

export function mapStudyGroup(db: StudyGroupRow): StudyGroup {
  const count = Array.isArray(db.patient_count) ? (db.patient_count[0]?.count ?? 0) : (db.patient_count ?? 0);
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    patientCount: count,
    driveFolderId: db.drive_folder_id ?? undefined,
    lastSync: db.last_sync ?? undefined,
  };
}

export function mapAuditEntry(db: AuditRow): AuditEntry {
  return {
    id: db.id,
    userId: db.user_id,
    userName: db.user_name,
    action: db.action,
    targetId: db.target_id,
    details: db.details,
    timestamp: db.timestamp,
  };
}

export function mapProfile(db: ProfileRow): AuthUser {
  return {
    id: db.id,
    name: db.name,
    role: ROLES.includes(db.role as AuthUser['role']) ? (db.role as AuthUser['role']) : 'Surgeon',
    email: db.email,
  };
}

/** Patient → insert/update payload for the `patients` table. */
export function patientToRow(p: Patient) {
  return {
    uhid: p.uhid,
    name: p.name,
    age_years: p.ageYears,
    age_months: p.ageMonths ?? null,
    gender: p.gender,
    diagnosis: p.diagnosis,
    primary_surgeon: p.primarySurgeon,
    // DATE columns reject empty strings, so blank dates become NULL.
    date_of_surgery: p.dateOfSurgery || null,
  };
}

export function surgeryToRow(patientUhid: string, s: SurgeryEvent) {
  return {
    id: s.id,
    patient_uhid: patientUhid,
    title: s.title,
    date: s.date,
    notes: s.notes ?? null,
    ot_notes: s.otNotes ?? null,
    finding_url: s.findingUrl ?? null,
  };
}
