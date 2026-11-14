import { describe, expect, it } from 'vitest';
import { mapMediaEntry, mapPatient, mapProfile, mapStudyGroup, patientToRow } from '../../src/lib/mappers';
import { readConfig } from '../../src/lib/env';
import { draftToPatient, emptyPatientDraft } from '../../src/lib/patientDraft';

describe('mappers', () => {
  it('maps a patient row with nested surgeries and groups', () => {
    const p = mapPatient({
      uhid: 'P1',
      name: 'Jane',
      age_years: 30,
      age_months: null,
      gender: 'Female',
      diagnosis: 'dx',
      primary_surgeon: 'Dr',
      created_at: '2026-01-01',
      date_of_surgery: null,
      deleted_at: null,
      surgeries: [{ id: 's1', title: 'Primary', date: '2026-01-02', ot_notes: 'ok', notes: null, finding_url: null }],
      study_groups: [{ study_group_id: 'g1' }],
    });
    expect(p.ageMonths).toBeUndefined();
    expect(p.dateOfSurgery).toBeUndefined();
    expect(p.surgeries[0]).toEqual({
      id: 's1',
      title: 'Primary',
      date: '2026-01-02',
      notes: undefined,
      otNotes: 'ok',
      findingUrl: undefined,
    });
    expect(p.studyGroupIds).toEqual(['g1']);
  });

  it('defaults missing nested collections', () => {
    const p = mapPatient({
      uhid: 'P',
      name: 'n',
      age_years: 0,
      gender: 'Other',
      diagnosis: '',
      primary_surgeon: '',
      created_at: 'x',
    });
    expect(p.surgeries).toEqual([]);
    expect(p.studyGroupIds).toEqual([]);
  });

  it('maps media rows, turning null surgery into an empty id', () => {
    const m = mapMediaEntry({
      id: 'm',
      patient_uhid: 'P',
      surgery_id: null,
      stage: 'Pre-operative',
      type: 'image',
      url: 'u',
      uploaded_at: 't',
      tags: null,
      storage_location: 'Local Storage',
    });
    expect(m.surgeryId).toBe('');
    expect(m.tags).toEqual([]);
  });

  it('reads the aggregate patient count for study groups', () => {
    expect(mapStudyGroup({ id: 'g', name: 'n', description: 'd', patient_count: [{ count: 4 }] }).patientCount).toBe(4);
    expect(mapStudyGroup({ id: 'g', name: 'n', description: 'd', patient_count: [] }).patientCount).toBe(0);
    expect(mapStudyGroup({ id: 'g', name: 'n', description: 'd' }).patientCount).toBe(0);
  });

  it('guards profile roles', () => {
    expect(mapProfile({ id: '1', name: 'n', role: 'Fellow', email: 'e' }).role).toBe('Fellow');
    expect(mapProfile({ id: '1', name: 'n', role: 'Admin', email: 'e' }).role).toBe('Surgeon');
  });

  it('coerces blank surgery dates to null when writing patients', () => {
    const row = patientToRow(draftToPatient({ ...emptyPatientDraft('Dr'), uhid: 'P', name: 'n' }));
    expect(row.date_of_surgery).toBeNull();
  });
});

describe('patient drafts', () => {
  const now = new Date('2026-11-14T10:00:00Z');

  it('trims fields, clamps age and creates a primary surgery when dated', () => {
    const p = draftToPatient(
      { ...emptyPatientDraft(' Dr Rao '), uhid: ' P-1 ', name: ' Jane ', ageYears: '-4', dateOfSurgery: '2026-11-01' },
      now,
    );
    expect(p).toMatchObject({
      uhid: 'P-1',
      name: 'Jane',
      ageYears: 0,
      primarySurgeon: 'Dr Rao',
      createdAt: now.toISOString(),
    });
    expect(p.surgeries).toHaveLength(1);
    expect(p.surgeries[0]).toMatchObject({ title: 'Primary Surgery', date: '2026-11-01' });
    expect(p.surgeries[0].id).toMatch(/^surg_/);
  });

  it('creates no surgery without a date', () => {
    const p = draftToPatient({ ...emptyPatientDraft(''), uhid: 'P', name: 'n', ageYears: '41.7' }, now);
    expect(p.surgeries).toEqual([]);
    expect(p.ageYears).toBe(41);
    expect(p.dateOfSurgery).toBeUndefined();
  });
});

describe('readConfig', () => {
  it('requires both Supabase variables', () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: ' https://x.supabase.co ', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({
      supabaseUrl: 'https://x.supabase.co',
      supabaseAnonKey: 'k',
    });
  });
});
