import React, { useState } from 'react';
import Modal from './Modal';
import { errorMessage } from '../lib/clinical';
import type { StudyGroup } from '../types';

interface StudyGroupModalProps {
  /** Existing group to edit, or `null` to create a new one. */
  group: StudyGroup | null;
  onSave: (name: string, description: string) => Promise<void>;
  onClose: () => void;
}

const fieldClass =
  'w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all';

const StudyGroupModal: React.FC<StudyGroupModalProps> = ({ group, onSave, onClose }) => {
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), description.trim());
    } catch (err) {
      setError(errorMessage(err, 'Could not save the study group.'));
      setSaving(false);
    }
  };

  return (
    <Modal title={group ? 'Update Study Group' : 'New Study Group'} onClose={onClose} busy={saving} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="block space-y-2">
          <span className="px-1 text-[12px] font-black uppercase tracking-widest text-slate-500">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            required
            maxLength={120}
          />
        </label>
        <label className="block space-y-2">
          <span className="px-1 text-[12px] font-black uppercase tracking-widest text-slate-500">Protocol / Notes</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${fieldClass} h-40 resize-none`}
            required
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-[1.5rem] bg-slate-900 py-5 text-xs font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? 'Saving…' : group ? 'Save Changes' : 'Create Group'}
        </button>
      </form>
    </Modal>
  );
};

export default StudyGroupModal;
