import React, { useState } from 'react';
import { UserPen } from 'lucide-react';
import Modal from './Modal';
import FormField from './FormField';
import { errorMessage } from '../lib/clinical';
import type { Gender, Patient } from '../types';
import { GENDERS } from '../lib/patientDraft';

interface PatientEditModalProps {
  patient: Patient;
  onSave: (patient: Patient) => Promise<void>;
  onClose: () => void;
}

const PatientEditModal: React.FC<PatientEditModalProps> = ({ patient, onSave, onClose }) => {
  const [draft, setDraft] = useState<Patient>(patient);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setNameError("Enter the patient's name.");
      return;
    }
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
      title="Edit patient record"
      description="Changes are recorded in the audit trail."
      onClose={onClose}
      busy={saving}
      size="lg"
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
          <UserPen size={20} aria-hidden="true" />
        </span>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* UHID is the primary key; changing it would orphan media and surgeries. */}
          <FormField label="UHID" hint="The UHID cannot be changed.">
            {(a) => (
              <input {...a} value={draft.uhid} readOnly className="field cursor-not-allowed font-mono text-ink-3" />
            )}
          </FormField>
          <FormField label="Lead Surgeon">
            {(a) => (
              <input
                {...a}
                value={draft.primarySurgeon}
                onChange={(e) => setDraft({ ...draft, primarySurgeon: e.target.value })}
                className="field"
              />
            )}
          </FormField>
        </div>
        <FormField label="Patient Name" required error={nameError}>
          {(a) => (
            <input
              {...a}
              value={draft.name}
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value });
                setNameError(undefined);
              }}
              className="field"
            />
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Age (years)">
            {(a) => (
              <input
                {...a}
                type="number"
                min={0}
                max={130}
                inputMode="numeric"
                value={draft.ageYears}
                onChange={(e) =>
                  setDraft({ ...draft, ageYears: Math.min(130, Math.max(0, Number(e.target.value) || 0)) })
                }
                className="field"
              />
            )}
          </FormField>
          <FormField label="Gender">
            {(a) => (
              <select
                {...a}
                value={draft.gender}
                onChange={(e) => setDraft({ ...draft, gender: e.target.value as Gender })}
                className="field"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
        <FormField label="Primary Diagnosis">
          {(a) => (
            <textarea
              {...a}
              value={draft.diagnosis}
              onChange={(e) => setDraft({ ...draft, diagnosis: e.target.value })}
              className="field h-28 resize-none leading-relaxed"
            />
          )}
        </FormField>
        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PatientEditModal;
