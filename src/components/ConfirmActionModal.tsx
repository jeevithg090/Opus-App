import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { errorMessage } from '../lib/clinical';
import type { Patient } from '../types';

export type RecordAction = 'soft-delete' | 'hard-delete' | 'restore';

interface ConfirmActionModalProps {
  action: RecordAction;
  patient: Patient;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const COPY: Record<RecordAction, { title: string; body: string; confirm: string; danger: boolean }> = {
  'soft-delete': {
    title: 'Archive patient record?',
    body: 'The record moves to the Archive and can be restored later.',
    confirm: 'Archive',
    danger: false,
  },
  'hard-delete': {
    title: 'Permanently delete record?',
    body: 'This permanently deletes the patient together with their surgeries, media entries and study-group memberships. It cannot be undone.',
    confirm: 'Delete permanently',
    danger: true,
  },
  restore: {
    title: 'Restore patient record?',
    body: 'The record returns to the active registry.',
    confirm: 'Restore',
    danger: false,
  },
};

/**
 * Confirmation step for destructive or state-changing record actions.
 * Permanent deletion additionally requires typing the patient's UHID.
 */
const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({ action, patient, onConfirm, onClose }) => {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[action];
  const requiresTyping = action === 'hard-delete';
  const canConfirm = !requiresTyping || typed.trim() === patient.uhid;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const Icon = action === 'restore' ? RotateCcw : copy.danger ? AlertTriangle : Trash2;

  return (
    <Modal
      title={copy.title}
      onClose={onClose}
      busy={busy}
      size="sm"
      icon={
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${copy.danger ? 'bg-danger-soft text-danger-ink' : 'bg-brand-soft text-brand-ink'}`}
        >
          <Icon size={20} aria-hidden="true" />
        </span>
      }
    >
      <form onSubmit={handleConfirm} className="space-y-5">
        <div className="space-y-3 text-sm leading-relaxed text-ink-2">
          <p className="rounded-xl border border-line bg-surface-2 px-3 py-2">
            <span className="font-semibold text-ink">{patient.name}</span>{' '}
            <span className="font-mono text-xs text-ink-3">{patient.uhid}</span>
          </p>
          <p>{copy.body}</p>
        </div>
        {requiresTyping && (
          <label className="block">
            <span className="field-label">
              Type <span className="font-mono text-ink">{patient.uhid}</span> to confirm
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="field font-mono focus:border-danger focus:ring-danger/15"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={!canConfirm || busy} className={copy.danger ? 'btn-danger' : 'btn-primary'}>
            {busy ? 'Working…' : copy.confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ConfirmActionModal;
