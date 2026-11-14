import React, { useState } from 'react';
import { ArrowLeft, Plus, UserPlus, Search, Edit3, UserMinus, ShieldCheck, Library, Users } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import type { StudyGroup, Patient } from '../types';
import { errorMessage, initials, matchesPatientSearch } from '../lib/clinical';

interface StudyGroupDetailViewProps {
  group: StudyGroup;
  patients: Patient[];
  onBack: () => void;
  onEditPatient: (p: Patient) => void;
  onEnroll: (uhid: string) => Promise<void>;
  onUnenroll: (uhid: string) => Promise<void>;
}

const StudyGroupDetailView: React.FC<StudyGroupDetailViewProps> = ({
  group,
  patients,
  onBack,
  onEditPatient,
  onEnroll,
  onUnenroll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const enrolledPatients = patients.filter((p) => p.studyGroupIds.includes(group.id));
  const availablePatients = patients.filter((p) => !p.studyGroupIds.includes(group.id));

  const filteredEnrolled = enrolledPatients.filter((p) => matchesPatientSearch(p, searchTerm));
  const [busyUhid, setBusyUhid] = useState<string | null>(null);

  const run = async (uhid: string, action: () => Promise<void>, fallback: string, onDone?: () => void) => {
    setActionError(null);
    setBusyUhid(uhid);
    try {
      await action();
      onDone?.();
    } catch (err) {
      setActionError(errorMessage(err, fallback));
    } finally {
      setBusyUhid(null);
    }
  };
  const unenroll = (p: Patient) => run(p.uhid, () => onUnenroll(p.uhid), 'Failed to remove patient from group.');

  const iconBtn =
    'flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink-3 shadow-card transition-colors disabled:opacity-50';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-32 lg:pb-12">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={onBack} className="btn-ghost -ml-2 px-2 text-ink-2">
          <ArrowLeft size={18} aria-hidden="true" /> Study Groups
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            setActionError(null);
          }}
          className="btn-primary w-full sm:w-auto"
        >
          <UserPlus size={18} aria-hidden="true" /> Enroll Patient
        </button>
      </div>

      {actionError && !isAdding && (
        <div role="alert" className="alert-error">
          {actionError}
        </div>
      )}

      <section className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between md:p-6">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="shrink-0 rounded-xl bg-brand-soft p-3 text-brand-ink">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-xl font-bold text-ink md:text-2xl">{group.name}</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-ink-2">{group.description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 sm:flex-col sm:items-end sm:border-0 sm:bg-transparent sm:p-0">
          <span className="text-xs font-medium text-ink-3 sm:order-2">Enrolled patients</span>
          <span className="text-3xl font-bold leading-none text-brand-ink tabular-nums">{enrolledPatients.length}</span>
        </div>
      </section>

      {enrolledPatients.length > 0 && (
        <div className="group relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4 transition-colors group-focus-within:text-brand-ink"
            size={18}
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Filter group members by name or UHID"
            placeholder="Filter members by name or UHID…"
            className="field bg-surface pl-11 shadow-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {filteredEnrolled.length === 0 ? (
        <div className="card">
          {enrolledPatients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No patients enrolled yet"
              description="Enroll patients from your registry to build this cohort."
              action={
                <button type="button" onClick={() => setIsAdding(true)} className="btn-primary">
                  <UserPlus size={18} aria-hidden="true" /> Enroll Patient
                </button>
              }
            />
          ) : (
            <EmptyState icon={Search} title="No members match your filter" />
          )}
        </div>
      ) : (
        <>
          {/* Phones: card stack */}
          <ul className="space-y-3 md:hidden">
            {filteredEnrolled.map((p) => (
              <li key={p.uhid} className="card space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand-ink"
                    >
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                      <p className="font-mono text-xs text-ink-3">{p.uhid}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onEditPatient(p)}
                      aria-label={`Edit ${p.name}`}
                      className={`${iconBtn} hover:text-ink`}
                    >
                      <Edit3 size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => unenroll(p)}
                      disabled={busyUhid === p.uhid}
                      aria-label={`Remove ${p.name} from group`}
                      className={`${iconBtn} hover:border-danger-line hover:text-danger-ink`}
                    >
                      <UserMinus size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="line-clamp-2 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-ink-2">
                  {p.diagnosis}
                </p>
              </li>
            ))}
          </ul>

          {/* Tablet and up: table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Patients enrolled in {group.name}</caption>
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th scope="col" className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
                    Patient
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
                    Diagnosis
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-3"
                  >
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredEnrolled.map((p) => (
                  <tr key={p.uhid} className="group transition-colors hover:bg-surface-2">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          aria-hidden="true"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-3 text-sm font-bold text-ink-2 transition-colors group-hover:bg-brand-soft group-hover:text-brand-ink"
                        >
                          {initials(p.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{p.name}</p>
                          <p className="font-mono text-xs text-ink-3">{p.uhid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="line-clamp-1 max-w-sm text-sm text-ink-2">{p.diagnosis}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEditPatient(p)}
                          aria-label={`Edit ${p.name}`}
                          className={`${iconBtn} hover:text-ink`}
                        >
                          <Edit3 size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => unenroll(p)}
                          disabled={busyUhid === p.uhid}
                          aria-label={`Remove ${p.name} from group`}
                          className={`${iconBtn} hover:border-danger-line hover:text-danger-ink`}
                        >
                          <UserMinus size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isAdding && (
        <Modal
          title="Enroll a patient"
          description={`Add a patient from your registry to “${group.name}”.`}
          onClose={() => setIsAdding(false)}
          busy={busyUhid !== null}
        >
          <div className="space-y-3">
            {actionError && (
              <div role="alert" className="alert-error">
                {actionError}
              </div>
            )}

            {availablePatients.length > 0 ? (
              <ul className="space-y-2">
                {availablePatients.map((p) => (
                  <li key={p.uhid}>
                    <button
                      type="button"
                      onClick={() =>
                        run(
                          p.uhid,
                          () => onEnroll(p.uhid),
                          'Enrollment failed. Please try again.',
                          () => setIsAdding(false),
                        )
                      }
                      disabled={busyUhid !== null}
                      className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3 text-left transition-colors hover:border-brand-line hover:bg-brand-soft disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink group-hover:text-brand-ink">
                          {p.name}
                        </span>
                        <span className="block font-mono text-xs text-ink-3">{p.uhid}</span>
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-3 group-hover:border-brand-line group-hover:text-brand-ink">
                        {busyUhid === p.uhid ? '…' : <Plus size={18} aria-hidden="true" />}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Library}
                title="Everyone is already enrolled"
                description="All patients in your registry are already in this group."
                className="py-8"
              />
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary w-full sm:w-auto">
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudyGroupDetailView;
