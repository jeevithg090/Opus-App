import { afterEach, describe, expect, it } from 'vitest';
import { initials } from '../../src/lib/clinical';
import { emptyPatientDraft, validatePatientDraft } from '../../src/lib/patientDraft';
import { applyTheme, resolveInitialTheme, THEME_STORAGE_KEY } from '../../src/lib/theme';
import { formatDocumentTitle } from '../../src/lib/hooks/useDocumentTitle';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};

describe('initials', () => {
  it('uses the first and last word', () => {
    expect(initials('Asha Menon')).toBe('AM');
    expect(initials('  dr. ravi  kumar rao ')).toBe('DR');
    expect(initials('Ravi')).toBe('R');
    expect(initials('')).toBe('?');
  });
});

describe('validatePatientDraft', () => {
  const valid = { ...emptyPatientDraft('Dr X'), uhid: 'H-1', name: 'Asha', diagnosis: 'Dx' };

  it('accepts a complete draft', () => {
    expect(validatePatientDraft(valid, '2026-11-14')).toEqual({});
  });

  it('flags missing required fields with friendly messages', () => {
    const errors = validatePatientDraft(emptyPatientDraft('Dr X'), '2026-11-14');
    expect(Object.keys(errors).sort()).toEqual(['diagnosis', 'name', 'uhid']);
    expect(errors.uhid).toMatch(/UHID/);
  });

  it('rejects out-of-range ages and future surgery dates', () => {
    const errors = validatePatientDraft({ ...valid, ageYears: '140', dateOfSurgery: '2026-12-01' }, '2026-11-14');
    expect(errors.ageYears).toBeDefined();
    expect(errors.dateOfSurgery).toBeDefined();
    expect(validatePatientDraft({ ...valid, ageYears: '', dateOfSurgery: '2026-11-14' }, '2026-11-14')).toEqual({});
  });
});

describe('theme', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('prefers a saved choice over the system setting', () => {
    expect(resolveInitialTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'light' }), true)).toBe('light');
    expect(resolveInitialTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'dark' }), false)).toBe('dark');
  });

  it('falls back to the system preference', () => {
    expect(resolveInitialTheme(memoryStorage(), true)).toBe('dark');
    expect(resolveInitialTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'bogus' }), false)).toBe('light');
  });

  it('applies and remembers the theme', () => {
    const storage = memoryStorage();
    applyTheme('dark', storage);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(storage.data[THEME_STORAGE_KEY]).toBe('dark');
  });
});

describe('formatDocumentTitle', () => {
  it('prefixes the section name', () => {
    expect(formatDocumentTitle('Audit Trail')).toBe('Audit Trail · OPUS');
    expect(formatDocumentTitle()).toMatch(/^OPUS · /);
  });
});
