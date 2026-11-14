import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

/** Dismissible toast for action results. Success notices auto-dismiss. */
const Notice: React.FC<{ notice: NoticeState; onDismiss: () => void }> = ({ notice, onDismiss }) => {
  useEffect(() => {
    if (notice.tone !== 'success') return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  const isError = notice.tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`fixed left-4 right-4 top-20 z-[800] mx-auto flex max-w-md animate-rise-in items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-raised backdrop-blur-md ${
        isError ? 'border-danger-line bg-danger-soft text-danger-ink' : 'border-brand-line bg-surface text-ink'
      }`}
    >
      {isError ? (
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-ink" aria-hidden="true" />
      )}
      <p className="flex-1">{notice.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-1.5 shrink-0 rounded-lg p-1.5 opacity-70 hover:opacity-100"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
};

export default Notice;
