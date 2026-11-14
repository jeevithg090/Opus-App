import React, { useState } from 'react';
import { UserCircle } from 'lucide-react';
import Modal from './Modal';
import { errorMessage } from '../lib/clinical';
import type { Gender, Patient } from '../types';
import { GENDERS } from '../lib/patientDraft';

interface PatientEditModalProps {
  patient: Patient;
  onSave: (patient: Patient) => Promise<void>;
  onClose: () => void;
}

const fieldClass =
  'w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all';
const labelClass = 'text-[12px] font-black uppercase tracking-widest text-slate-500';

const PatientEditModal: React.FC<PatientEditModalProps> = ({ patient, onSave, onClose }) => {
  const [draft, setDraft] = useState<Patient>(patient);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...draft, name: draft.name.trim(), primarySurgeon: draft.primarySurgeon.trim() });
    } catch (err) {
      setError(errorMessage(err, 'Could not update the patient record.'));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit Patient Record"
      onClose={onClose}
      busy={saving}
      size="lg"
      icon={<UserCircle className="text-teal-600" size={26} aria-hidden="true" />}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={labelClass}>UHID</span>
            {/* UHID is the primary key; changing it would orphan media and surgeries. */}
            <input
              value={draft.uhid}
              readOnly
              aria-readonly="true"
              className={`${fieldClass} cursor-not-allowed font-mono text-slate-500`}
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Lead Surgeon</span>
            <input
              value={draft.primarySurgeon}
              onChange={(e) => setDraft({ ...draft, primarySurgeon: e.target.value })}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="block space-y-2">
          <span className={labelClass}>Patient Name</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={fieldClass}
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-5">
          <label className="block space-y-2">
            <span className={labelClass}>Age (years)</span>
            <input
              type="number"
              min={0}
              max={130}
              value={draft.ageYears}
              onChange={(e) => setDraft({ ...draft, ageYears: Math.max(0, Number(e.target.value) || 0) })}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Gender</span>
            <select
              value={draft.gender}
              onChange={(e) => setDraft({ ...draft, gender: e.target.value as Gender })}
              className={fieldClass}
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-2">
          <span className={labelClass}>Primary Diagnosis</span>
          <textarea
            value={draft.diagnosis}
            onChange={(e) => setDraft({ ...draft, diagnosis: e.target.value })}
            className={`${fieldClass} h-28 resize-none leading-relaxed`}
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
          className="w-full rounded-[1.8rem] bg-slate-900 py-5 text-xs font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Update Registry'}
        </button>
      </form>
    </Modal>
  );
};

export default PatientEditModal;
