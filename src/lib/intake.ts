import { createId, mediaTypeFromFile, todayIsoDate } from './clinical';
import { StorageLocation } from '../types';
import type { Patient, SurgeryEvent, SurgicalStage } from '../types';
import type { NewMediaEntry } from './hooks/useMedia';

/** Data collected by the intake form. */
export interface IntakeInput {
  uhid: string;
  stage: SurgicalStage;
  /** Existing surgery id; ignored when `newSurgery` is provided. */
  surgeryId?: string;
  newSurgery?: { title: string; date?: string };
  notes?: string;
  files: File[];
  storageLocation?: StorageLocation;
}

/** Side effects needed by the intake flow (injected so the flow is testable). */
export interface IntakeDeps {
  addSurgery: (uhid: string, surgery: SurgeryEvent) => Promise<void>;
  appendSurgeryNotes: (surgeryId: string, existing: string | undefined, entry: string) => Promise<void>;
  uploadFile: (file: File, index: number, timestamp: number) => Promise<string>;
  removeFiles: (paths: string[]) => Promise<void>;
  addMedia: (entries: NewMediaEntry[]) => Promise<void>;
  now?: () => Date;
}

export interface IntakeResult {
  surgeryId: string;
  uploaded: number;
  notesSaved: boolean;
}

/**
 * Records an intake session: optionally creates a procedure, uploads files to
 * storage, inserts media rows and appends notes to the procedure's operative log.
 * If inserting media rows fails, already-uploaded files are removed.
 */
export async function submitIntake(patient: Patient, input: IntakeInput, deps: IntakeDeps): Promise<IntakeResult> {
  const now = deps.now?.() ?? new Date();
  const notes = input.notes?.trim() ?? '';
  const files = input.files ?? [];
  if (files.length === 0 && !notes) {
    throw new Error('Attach at least one file or enter clinical notes.');
  }

  const surgery = await resolveSurgery(patient, input, deps, now);

  const timestamp = now.getTime();
  const uploadedPaths: string[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      uploadedPaths.push(await deps.uploadFile(files[i], i, timestamp));
    }
    await deps.addMedia(
      files.map((file, i) => ({
        uhid: patient.uhid,
        surgeryId: surgery.id,
        stage: input.stage,
        type: mediaTypeFromFile(file),
        url: uploadedPaths[i],
        uploadedAt: now.toISOString(),
        tags: [],
        storageLocation: input.storageLocation ?? StorageLocation.LOCAL,
        notes: i === 0 && notes ? notes : undefined,
      })),
    );
  } catch (err) {
    await deps.removeFiles(uploadedPaths);
    throw err;
  }

  if (notes) {
    const entry = `[${input.stage} · ${todayIsoDate(now)}] ${notes}`;
    await deps.appendSurgeryNotes(surgery.id, surgery.otNotes, entry);
  }

  return { surgeryId: surgery.id, uploaded: files.length, notesSaved: Boolean(notes) };
}

async function resolveSurgery(
  patient: Patient,
  input: IntakeInput,
  deps: IntakeDeps,
  now: Date,
): Promise<SurgeryEvent> {
  if (input.newSurgery) {
    const title = input.newSurgery.title.trim();
    if (!title) throw new Error('Enter a title for the new procedure.');
    const surgery: SurgeryEvent = { id: createId('surg'), title, date: input.newSurgery.date || todayIsoDate(now) };
    await deps.addSurgery(patient.uhid, surgery);
    return surgery;
  }
  const existing = patient.surgeries.find((s) => s.id === input.surgeryId);
  if (!existing) throw new Error('Select a procedure for this session.');
  return existing;
}
