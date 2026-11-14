import { MediaType } from '../types';
import type { AuditEntry, MediaEntry, Patient, SurgeryEvent } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Number of days an archived patient is retained before it is eligible for purge. */
export const ARCHIVE_RETENTION_DAYS = 30;

/**
 * Parses a date string. Date-only strings (`YYYY-MM-DD`) are interpreted in the
 * local time zone rather than UTC, so day arithmetic does not drift by one day
 * for users west of Greenwich.
 */
export function parseDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(value);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
}

/** Returns the surgery with the latest date, or `undefined` when there are none. */
export function latestSurgery(surgeries: SurgeryEvent[]): SurgeryEvent | undefined {
  return surgeries.reduce<SurgeryEvent | undefined>((latest, s) => {
    if (!latest) return s;
    return parseDate(s.date).getTime() > parseDate(latest.date).getTime() ? s : latest;
  }, undefined);
}

/**
 * Post-operative day for a surgery date: 0 on the day of surgery, 1 the day after, etc.
 * Returns `null` for missing, invalid or future dates.
 */
export function postOpDay(surgeryDate: string | undefined, today: Date = new Date()): number | null {
  if (!surgeryDate) return null;
  const date = parseDate(surgeryDate);
  if (Number.isNaN(date.getTime())) return null;
  const days = calendarDaysBetween(date, today);
  return days >= 0 ? days : null;
}

/** Post-operative day relative to the patient's most recent surgery. */
export function patientPostOpDay(patient: Pick<Patient, 'surgeries'>, today: Date = new Date()): number | null {
  return postOpDay(latestSurgery(patient.surgeries ?? [])?.date, today);
}

/** Days left before an archived record reaches the end of its retention window (never negative). */
export function retentionDaysRemaining(
  deletedAt: string,
  now: Date = new Date(),
  retentionDays: number = ARCHIVE_RETENTION_DAYS,
): number {
  const deleted = new Date(deletedAt);
  if (Number.isNaN(deleted.getTime())) return 0;
  const purgeAt = deleted.getTime() + retentionDays * MS_PER_DAY;
  return Math.max(0, Math.ceil((purgeAt - now.getTime()) / MS_PER_DAY));
}

/** Maps a browser File's MIME type (and name as a fallback) to a media category. */
export function mediaTypeFromFile(file: Pick<File, 'type' | 'name'>): MediaType {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('video/')) return MediaType.VIDEO;
  if (mime.startsWith('audio/')) return MediaType.AUDIO;
  if (mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return MediaType.PDF;
  return MediaType.IMAGE;
}

/** Replaces characters that are unsafe in storage object keys. */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.length > 0 ? cleaned.slice(-120) : 'file';
}

/**
 * Storage key for an uploaded file. The first path segment must be the user's id:
 * storage RLS policies only allow access to objects under `{auth.uid()}/`.
 */
export function buildStoragePath(
  userId: string,
  uhid: string,
  timestamp: number,
  index: number,
  fileName: string,
): string {
  return `${userId}/${sanitizeFileName(uhid)}/${timestamp}-${index}-${sanitizeFileName(fileName)}`;
}

/**
 * Extracts the object key from a Supabase Storage URL (public or signed) for the
 * given bucket. Plain object keys are returned unchanged. Returns `null` for
 * URLs that do not point at the bucket.
 */
export function extractStoragePath(url: string, bucket: string): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return url.replace(/^\/+/, '') || null;
  const match = new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${bucket}/([^?#]+)`).exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Case-insensitive match on patient name or UHID. */
export function matchesPatientSearch(patient: Pick<Patient, 'name' | 'uhid'>, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return patient.name.toLowerCase().includes(q) || patient.uhid.toLowerCase().includes(q);
}

/** Filters audit entries by a free-text term and returns them newest first. */
export function filterAuditLogs(logs: AuditEntry[], term: string): AuditEntry[] {
  const q = term.trim().toLowerCase();
  return logs
    .filter(
      (log) =>
        !q ||
        [log.userName, log.action, log.targetId, log.details].some((field) => (field ?? '').toLowerCase().includes(q)),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export type ActivityItem =
  | { kind: 'media'; id: string; date: string; media: MediaEntry }
  | { kind: 'notes'; id: string; date: string; uhid: string; patientName: string; notes: string };

/** Most recent media uploads and operative notes, newest first. */
export function buildRecentActivity(media: MediaEntry[], patients: Patient[], limit = 15): ActivityItem[] {
  const items: ActivityItem[] = [
    ...media.map((m): ActivityItem => ({ kind: 'media', id: `media-${m.id}`, date: m.uploadedAt, media: m })),
    ...patients.flatMap((p) =>
      p.surgeries
        .filter((s) => s.otNotes)
        .map((s): ActivityItem => ({
          kind: 'notes',
          id: `notes-${s.id}`,
          date: s.date,
          uhid: p.uhid,
          patientName: p.name,
          notes: s.otNotes ?? '',
        })),
    ),
  ];
  return items.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()).slice(0, limit);
}

/** Today's date as `YYYY-MM-DD` in the local time zone. */
export function todayIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Generates a reasonably unique client-side id with the given prefix. */
export function createId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

/** Extracts a human-readable message from an unknown thrown value. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  if (typeof err === 'string' && err) return err;
  return fallback;
}

/** Up to two initials for an avatar, e.g. "Asha Menon" → "AM", "Ravi" → "R". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}
