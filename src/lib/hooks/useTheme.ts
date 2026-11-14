import { useCallback, useState } from 'react';
import { applyTheme, resolveInitialTheme, type Theme } from '../theme';

/** Current colour theme plus a toggle. The initial value is applied by a script in index.html before first paint. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    const current = document.documentElement.dataset.theme;
    return current === 'dark' || current === 'light' ? current : resolveInitialTheme();
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
