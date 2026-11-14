export enum SurgicalStage {
  PRE_OP = 'Pre-operative',
  INTRA_OP = 'Intra-operative',
  POST_OP = 'Post-operative',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  PDF = 'pdf',
}

export enum StorageLocation {
  GOOGLE_DRIVE = 'Google Drive',
  LOCAL = 'Local Storage',
}

export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  patientCount: number;
  driveFolderId?: string;
  lastSync?: string;
}

export interface SurgeryEvent {
  id: string;
  title: string;
  date: string;
  notes?: string;
  otNotes?: string;
  findingUrl?: string; // URL for uploaded PDF findings
}

export interface MediaEntry {
  id: string;
  uhid: string;
  surgeryId: string;
  stage: SurgicalStage;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  notes?: string;
  tags: string[];
  storageLocation: StorageLocation;
}

export interface Patient {
  uhid: string;
  name: string;
  ageYears: number;
  ageMonths?: number;
  gender: Gender;
  diagnosis: string;
  primarySurgeon: string;
  studyGroupIds: string[];
  createdAt: string;
  surgeries: SurgeryEvent[];
  dateOfSurgery?: string;
  deletedAt?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  role: 'Surgeon' | 'Fellow' | 'Researcher';
  email: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetId: string;
  details: string;
  timestamp: string;
}
