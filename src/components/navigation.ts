export type ViewId = 'dashboard' | 'upload' | 'research' | 'audit' | 'recycle';

export const VIEW_TITLES: Record<ViewId, string> = {
  dashboard: 'Patient Registry',
  upload: 'Patient Intake',
  research: 'Study Groups',
  audit: 'Audit Trail',
  recycle: 'Archive',
};
