import { describe, expect, it, vi } from 'vitest';
import { submitIntake, type IntakeDeps } from '../../src/lib/intake';
import { MediaType, StorageLocation, SurgicalStage } from '../../src/types';
import type { Patient } from '../../src/types';

const patient: Patient = {
  uhid: 'P1',
  name: 'Jane',
  ageYears: 30,
  gender: 'Female',
  diagnosis: '',
  primarySurgeon: '',
  studyGroupIds: [],
  createdAt: '2026-01-01',
  surgeries: [{ id: 's1', title: 'Primary', date: '2026-11-01', otNotes: 'Earlier note' }],
};

const file = (name: string, type: string) => new File(['x'], name, { type });
const now = new Date(2026, 10, 14, 9, 0);

function makeDeps(overrides: Partial<IntakeDeps> = {}): IntakeDeps {
  return {
    addSurgery: vi.fn().mockResolvedValue(undefined),
    appendSurgeryNotes: vi.fn().mockResolvedValue(undefined),
    uploadFile: vi.fn(async (f: File, i: number) => `user/P1/${i}-${f.name}`),
    removeFiles: vi.fn().mockResolvedValue(undefined),
    addMedia: vi.fn().mockResolvedValue(undefined),
    now: () => now,
    ...overrides,
  };
}

describe('submitIntake', () => {
  it('uploads files and records media against an existing surgery', async () => {
    const deps = makeDeps();
    const result = await submitIntake(
      patient,
      {
        uhid: 'P1',
        stage: SurgicalStage.POST_OP,
        surgeryId: 's1',
        files: [file('a.png', 'image/png'), file('b.pdf', 'application/pdf')],
        storageLocation: StorageLocation.GOOGLE_DRIVE,
        notes: '  Healing well ',
      },
      deps,
    );

    expect(result).toEqual({ surgeryId: 's1', uploaded: 2, notesSaved: true });
    expect(deps.addSurgery).not.toHaveBeenCalled();
    expect(deps.uploadFile).toHaveBeenCalledTimes(2);
    const entries = vi.mocked(deps.addMedia).mock.calls[0][0];
    expect(entries.map((e) => [e.type, e.url, e.surgeryId, e.storageLocation, e.notes])).toEqual([
      [MediaType.IMAGE, 'user/P1/0-a.png', 's1', StorageLocation.GOOGLE_DRIVE, 'Healing well'],
      [MediaType.PDF, 'user/P1/1-b.pdf', 's1', StorageLocation.GOOGLE_DRIVE, undefined],
    ]);
    expect(deps.appendSurgeryNotes).toHaveBeenCalledWith(
      's1',
      'Earlier note',
      '[Post-operative · 2026-11-14] Healing well',
    );
  });

  it('creates a new procedure when requested and saves notes-only sessions', async () => {
    const deps = makeDeps();
    const result = await submitIntake(
      patient,
      { uhid: 'P1', stage: SurgicalStage.PRE_OP, newSurgery: { title: ' Revision ' }, notes: 'Plan', files: [] },
      deps,
    );
    const created = vi.mocked(deps.addSurgery).mock.calls[0][1];
    expect(created).toMatchObject({ title: 'Revision', date: '2026-11-14' });
    expect(result.surgeryId).toBe(created.id);
    expect(deps.uploadFile).not.toHaveBeenCalled();
    expect(deps.appendSurgeryNotes).toHaveBeenCalledWith(created.id, undefined, '[Pre-operative · 2026-11-14] Plan');
  });

  it('defaults the storage tag to Local Storage', async () => {
    const deps = makeDeps();
    await submitIntake(
      patient,
      { uhid: 'P1', stage: SurgicalStage.PRE_OP, surgeryId: 's1', files: [file('a.mp4', 'video/mp4')] },
      deps,
    );
    expect(vi.mocked(deps.addMedia).mock.calls[0][0][0]).toMatchObject({
      storageLocation: StorageLocation.LOCAL,
      type: MediaType.VIDEO,
    });
    expect(deps.appendSurgeryNotes).not.toHaveBeenCalled();
  });

  it('rejects empty sessions and missing procedures before touching storage', async () => {
    const deps = makeDeps();
    await expect(
      submitIntake(patient, { uhid: 'P1', stage: SurgicalStage.PRE_OP, surgeryId: 's1', files: [], notes: '  ' }, deps),
    ).rejects.toThrow(/at least one file/);
    await expect(
      submitIntake(
        patient,
        { uhid: 'P1', stage: SurgicalStage.PRE_OP, surgeryId: 'nope', files: [], notes: 'x' },
        deps,
      ),
    ).rejects.toThrow(/Select a procedure/);
    await expect(
      submitIntake(
        patient,
        { uhid: 'P1', stage: SurgicalStage.PRE_OP, newSurgery: { title: ' ' }, files: [], notes: 'x' },
        deps,
      ),
    ).rejects.toThrow(/title/);
    expect(deps.uploadFile).not.toHaveBeenCalled();
  });

  it('removes uploaded files when recording media fails', async () => {
    const deps = makeDeps({ addMedia: vi.fn().mockRejectedValue(new Error('insert failed')) });
    await expect(
      submitIntake(
        patient,
        { uhid: 'P1', stage: SurgicalStage.PRE_OP, surgeryId: 's1', files: [file('a.png', 'image/png')] },
        deps,
      ),
    ).rejects.toThrow('insert failed');
    expect(deps.removeFiles).toHaveBeenCalledWith(['user/P1/0-a.png']);
  });

  it('removes earlier uploads when a later upload fails', async () => {
    const uploadFile = vi.fn().mockResolvedValueOnce('user/P1/0-a.png').mockRejectedValueOnce(new Error('quota'));
    const deps = makeDeps({ uploadFile });
    await expect(
      submitIntake(
        patient,
        {
          uhid: 'P1',
          stage: SurgicalStage.PRE_OP,
          surgeryId: 's1',
          files: [file('a.png', 'image/png'), file('b.png', 'image/png')],
        },
        deps,
      ),
    ).rejects.toThrow('quota');
    expect(deps.removeFiles).toHaveBeenCalledWith(['user/P1/0-a.png']);
    expect(deps.addMedia).not.toHaveBeenCalled();
  });
});
