import { describe, expect, it } from 'vitest';
import {
  buildRecentActivity,
  buildStoragePath,
  calendarDaysBetween,
  errorMessage,
  extractStoragePath,
  filterAuditLogs,
  latestSurgery,
  matchesPatientSearch,
  mediaTypeFromFile,
  parseDate,
  patientPostOpDay,
  postOpDay,
  retentionDaysRemaining,
  sanitizeFileName,
  todayIsoDate,
} from '../../src/lib/clinical';
import { MediaType, StorageLocation, SurgicalStage } from '../../src/types';
import type { AuditEntry, MediaEntry, Patient } from '../../src/types';

const patient = (overrides: Partial<Patient> = {}): Patient => ({
  uhid: 'HOSP-001',
  name: 'Jane Doe',
  ageYears: 40,
  gender: 'Female',
  diagnosis: 'Cleft lip',
  primarySurgeon: 'Dr. Rao',
  studyGroupIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  surgeries: [],
  ...overrides,
});

describe('parseDate', () => {
  it('interprets date-only strings in local time', () => {
    const d = parseDate('2026-03-05');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 5, 0]);
  });

  it('parses full timestamps normally', () => {
    expect(parseDate('2026-03-05T10:00:00.000Z').toISOString()).toBe('2026-03-05T10:00:00.000Z');
  });
});

describe('postOpDay', () => {
  const today = new Date(2026, 10, 14, 23, 30); // 14 Nov 2026, late evening

  it('is 0 on the day of surgery and counts calendar days after', () => {
    expect(postOpDay('2026-11-14', today)).toBe(0);
    expect(postOpDay('2026-11-13', today)).toBe(1);
    expect(postOpDay('2026-10-15', today)).toBe(30);
  });

  it('returns null for future, missing or invalid dates', () => {
    expect(postOpDay('2026-11-15', today)).toBeNull();
    expect(postOpDay(undefined, today)).toBeNull();
    expect(postOpDay('not-a-date', today)).toBeNull();
  });

  it('uses the most recent surgery for a patient', () => {
    const p = patient({
      surgeries: [
        { id: 'a', title: 'Primary', date: '2026-01-10' },
        { id: 'b', title: 'Revision', date: '2026-11-04' },
        { id: 'c', title: 'Early', date: '2025-06-01' },
      ],
    });
    expect(latestSurgery(p.surgeries)?.id).toBe('b');
    expect(patientPostOpDay(p, today)).toBe(10);
    expect(patientPostOpDay(patient(), today)).toBeNull();
  });

  it('counts calendar days across DST changes', () => {
    expect(calendarDaysBetween(new Date(2026, 2, 1), new Date(2026, 3, 1))).toBe(31);
  });
});

describe('retentionDaysRemaining', () => {
  const deletedAt = '2026-11-01T12:00:00.000Z';

  it('counts down from the retention window', () => {
    expect(retentionDaysRemaining(deletedAt, new Date('2026-11-01T12:00:00.000Z'))).toBe(30);
    expect(retentionDaysRemaining(deletedAt, new Date('2026-11-11T12:00:00.000Z'))).toBe(20);
    expect(retentionDaysRemaining(deletedAt, new Date('2026-11-11T13:00:00.000Z'))).toBe(20);
  });

  it('never goes negative and handles bad input', () => {
    expect(retentionDaysRemaining(deletedAt, new Date('2027-01-01T00:00:00.000Z'))).toBe(0);
    expect(retentionDaysRemaining('garbage')).toBe(0);
  });

  it('supports custom windows', () => {
    expect(retentionDaysRemaining(deletedAt, new Date(deletedAt), 7)).toBe(7);
  });
});

describe('mediaTypeFromFile', () => {
  it.each([
    [{ type: 'image/png', name: 'a.png' }, MediaType.IMAGE],
    [{ type: 'video/mp4', name: 'a.mp4' }, MediaType.VIDEO],
    [{ type: 'audio/mpeg', name: 'a.mp3' }, MediaType.AUDIO],
    [{ type: 'application/pdf', name: 'a.pdf' }, MediaType.PDF],
    [{ type: '', name: 'REPORT.PDF' }, MediaType.PDF],
    [{ type: '', name: 'unknown' }, MediaType.IMAGE],
  ])('%o → %s', (file, expected) => {
    expect(mediaTypeFromFile(file)).toBe(expected);
  });
});

describe('storage paths', () => {
  it('sanitizes file names', () => {
    expect(sanitizeFileName('my photo (1).jpg')).toBe('my_photo_1_.jpg');
    expect(sanitizeFileName('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(sanitizeFileName('')).toBe('file');
    expect(sanitizeFileName('a'.repeat(300)).length).toBe(120);
  });

  it('places objects under the user id folder', () => {
    const path = buildStoragePath('user-1', 'HOSP/001', 1700000000000, 2, 'scan 1.png');
    expect(path).toBe('user-1/HOSP_001/1700000000000-2-scan_1.png');
    expect(path.split('/')[0]).toBe('user-1');
  });

  it('extracts object keys from public and signed URLs', () => {
    const base = 'https://abc.supabase.co/storage/v1/object';
    expect(extractStoragePath(`${base}/public/opus-media/u1/P1/x%20y.png`, 'opus-media')).toBe('u1/P1/x y.png');
    expect(extractStoragePath(`${base}/sign/opus-media/u1/P1/a.png?token=abc`, 'opus-media')).toBe('u1/P1/a.png');
    expect(extractStoragePath('u1/P1/a.png', 'opus-media')).toBe('u1/P1/a.png');
    expect(extractStoragePath(`${base}/public/other-bucket/a.png`, 'opus-media')).toBeNull();
    expect(extractStoragePath('https://example.com/photo.jpg', 'opus-media')).toBeNull();
    expect(extractStoragePath('', 'opus-media')).toBeNull();
  });
});

describe('search and filtering', () => {
  it('matches patients by name or UHID, case-insensitively', () => {
    const p = patient();
    expect(matchesPatientSearch(p, '')).toBe(true);
    expect(matchesPatientSearch(p, '  jane ')).toBe(true);
    expect(matchesPatientSearch(p, 'hosp-0')).toBe(true);
    expect(matchesPatientSearch(p, 'smith')).toBe(false);
  });

  it('filters audit logs and sorts newest first', () => {
    const logs: AuditEntry[] = [
      {
        id: '1',
        userId: 'u',
        userName: 'Dr A',
        action: 'Patient Creation',
        targetId: 'P1',
        details: 'x',
        timestamp: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        userId: 'u',
        userName: 'Dr A',
        action: 'Vault Sync',
        targetId: 'P2',
        details: 'Drive',
        timestamp: '2026-03-01T00:00:00Z',
      },
      {
        id: '3',
        userId: 'u',
        userName: 'Dr B',
        action: 'Patient Correction',
        targetId: 'P1',
        details: 'y',
        timestamp: '2026-02-01T00:00:00Z',
      },
    ];
    expect(filterAuditLogs(logs, '').map((l) => l.id)).toEqual(['2', '3', '1']);
    expect(filterAuditLogs(logs, 'patient').map((l) => l.id)).toEqual(['3', '1']);
    expect(filterAuditLogs(logs, 'drive').map((l) => l.id)).toEqual(['2']);
    expect(filterAuditLogs(logs, 'dr b').map((l) => l.id)).toEqual(['3']);
  });
});

describe('buildRecentActivity', () => {
  const media = (id: string, uploadedAt: string): MediaEntry => ({
    id,
    uhid: 'HOSP-001',
    surgeryId: 's1',
    stage: SurgicalStage.PRE_OP,
    type: MediaType.IMAGE,
    url: 'u',
    uploadedAt,
    tags: [],
    storageLocation: StorageLocation.LOCAL,
  });

  it('merges media and operative notes, newest first, with a limit', () => {
    const p = patient({
      surgeries: [
        { id: 's1', title: 'Primary', date: '2026-02-15', otNotes: 'Uneventful' },
        { id: 's2', title: 'No notes', date: '2026-03-01' },
      ],
    });
    const items = buildRecentActivity([media('m1', '2026-01-01T00:00:00Z'), media('m2', '2026-03-01T00:00:00Z')], [p]);
    expect(items.map((i) => i.id)).toEqual(['media-m2', 'notes-s1', 'media-m1']);
    expect(buildRecentActivity([media('m1', '2026-01-01T00:00:00Z')], [p], 1)).toHaveLength(1);
  });
});

describe('helpers', () => {
  it('formats today as a local ISO date', () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('extracts error messages from unknown values', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage({ message: 'pg error' })).toBe('pg error');
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage(null, 'fallback')).toBe('fallback');
  });
});
