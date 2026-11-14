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
      icon={<Icon size={22} aria-hidden="true" className={copy.danger ? 'text-red-500' : 'text-teal-600'} />}
    >
      <form onSubmit={handleConfirm} className="space-y-6">
        <div className="space-y-2 text-sm leading-relaxed text-slate-600">
          <p>
            <span className="font-bold text-slate-900">{patient.name}</span>{' '}
            <span className="font-mono text-xs text-slate-500">({patient.uhid})</span>
          </p>
          <p>{copy.body}</p>
        </div>
        {requiresTyping && (
          <label className="block space-y-2">
            <span className="text-xs font-bold text-slate-600">
              Type <span className="font-mono text-slate-900">{patient.uhid}</span> to confirm
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl py-3 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canConfirm || busy}
            className={`flex-1 rounded-xl py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${copy.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {busy ? 'Working…' : copy.confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ConfirmActionModal;
