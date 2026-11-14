import React, { useState } from 'react';
import { Library } from 'lucide-react';
import Modal from './Modal';
import FormField from './FormField';
import { errorMessage } from '../lib/clinical';
import type { StudyGroup } from '../types';

interface StudyGroupModalProps {
  /** Existing group to edit, or `null` to create a new one. */
  group: StudyGroup | null;
  onSave: (name: string, description: string) => Promise<void>;
  onClose: () => void;
}

type Errors = Partial<Record<'name' | 'description', string>>;

const StudyGroupModal: React.FC<StudyGroupModalProps> = ({ group, onSave, onClose }) => {
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Give the study group a name.';
    if (!description.trim()) next.description = 'Describe the protocol or purpose of this group.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
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
    <Modal
      title={group ? 'Edit study group' : 'New study group'}
      description="Group patients into a research cohort."
      onClose={onClose}
      busy={saving}
      size="lg"
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
          <Library size={20} aria-hidden="true" />
        </span>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label="Name" required error={errors.name}>
          {(a) => (
            <input
              {...a}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="e.g. Free flap outcomes 2026"
              className="field"
              maxLength={120}
            />
          )}
        </FormField>
        <FormField label="Protocol / Notes" required error={errors.description}>
          {(a) => (
            <textarea
              {...a}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((p) => ({ ...p, description: undefined }));
              }}
              placeholder="Inclusion criteria, photo protocol, follow-up schedule…"
              className="field h-36 resize-none leading-relaxed"
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
            {saving ? 'Saving…' : group ? 'Save changes' : 'Create group'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StudyGroupModal;
