export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'opus-theme';

/** Reads the saved theme, falling back to the operating system preference. */
export function resolveInitialTheme(
  storage: Pick<Storage, 'getItem'> | null = safeStorage(),
  prefersDark: boolean = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches,
): Theme {
  const saved = storage?.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return prefersDark ? 'dark' : 'light';
}

/** Applies the theme to <html> and remembers the choice. */
export function applyTheme(theme: Theme, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#0b1120' : '#f6f8fa';
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this visit.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}
