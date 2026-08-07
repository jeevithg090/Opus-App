import { Patient, SurgeryEvent, MediaEntry, StudyGroup, AuditEntry, StorageLocation, MediaType } from '../types';

export function mapSurgery(db: any): SurgeryEvent {
  return {
    id: db.id,
    title: db.title,
    date: db.date,
    notes: db.notes ?? undefined,
    otNotes: db.ot_notes ?? undefined,
    findingUrl: db.finding_url ?? undefined,
  };
}

export function mapMediaEntry(db: any): MediaEntry {
  return {
    id: db.id,
    uhid: db.patient_uhid,
    surgeryId: db.surgery_id ?? '',
    stage: db.stage as any,
    type: db.type as MediaType,
    url: db.url,
    thumbnailUrl: db.thumbnail_url ?? undefined,
    uploadedAt: db.uploaded_at,
    notes: db.notes ?? undefined,
    tags: db.tags ?? [],
    storageLocation: db.storage_location as StorageLocation,
  };
}

export function mapPatient(db: any): Patient {
  return {
    uhid: db.uhid,
    name: db.name,
    ageYears: db.age_years,
    ageMonths: db.age_months ?? undefined,
    gender: db.gender as any,
    diagnosis: db.diagnosis,
    primarySurgeon: db.primary_surgeon,
    studyGroupIds: db.study_groups?.map((s: any) => s.study_group_id) ?? [],
    createdAt: db.created_at,
    dateOfSurgery: db.date_of_surgery ?? undefined,
    deletedAt: db.deleted_at ?? undefined,
    surgeries: (db.surgeries ?? []).map(mapSurgery),
  };
}

export function mapStudyGroup(db: any): StudyGroup {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    patientCount: db.patient_count ?? 0,
    driveFolderId: db.drive_folder_id ?? undefined,
    lastSync: db.last_sync ?? undefined,
  };
}

export function mapAuditEntry(db: any): AuditEntry {
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
