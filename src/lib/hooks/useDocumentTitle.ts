import { useEffect } from 'react';

export const APP_NAME = 'OPUS';

/** Formats a page title as "Section · OPUS". */
export function formatDocumentTitle(section?: string | null): string {
  return section ? `${section} · ${APP_NAME}` : `${APP_NAME} · Operative Photo Unite and Storage`;
}

/** Keeps `document.title` in sync with the visible screen so tabs and history entries are distinguishable. */
export function useDocumentTitle(section?: string | null): void {
  useEffect(() => {
    document.title = formatDocumentTitle(section);
  }, [section]);
}
