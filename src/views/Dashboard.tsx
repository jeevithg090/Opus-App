import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  ChevronRight,
  FileText,
  Clock,
  Video,
  Music,
  Users,
  Images,
  Library,
  Stethoscope,
  UserPlus,
} from 'lucide-react';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import FormField from '../components/FormField';
import { MediaType } from '../types';
import type { Gender, MediaEntry, Patient, StudyGroup } from '../types';
import {
  buildRecentActivity,
  errorMessage,
  matchesPatientSearch,
  initials,
  patientPostOpDay,
  todayIsoDate,
} from '../lib/clinical';
import {
  GENDERS,
  draftToPatient,
  emptyPatientDraft,
  validatePatientDraft,
  type PatientDraft,
  type PatientDraftErrors,
} from '../lib/patientDraft';

interface DashboardProps {
  patients: Patient[];
  studyGroups: StudyGroup[];
  media: MediaEntry[];
  /** Pre-fills the lead surgeon field for new patients. */
  defaultSurgeon: string;
  onAddPatient: (patient: Patient) => Promise<void>;
  onSelectPatient: (patient: Patient) => void;
}

const ActivityTile: React.FC<{ media: MediaEntry }> = ({ media }) => {
  if (media.type === MediaType.IMAGE) {
    return (
      <img
        src={media.url}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    );
  }
  const Icon = media.type === MediaType.VIDEO ? Video : media.type === MediaType.AUDIO ? Music : FileText;
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-surface-3 pb-10 text-ink-3">
      <Icon size={28} aria-hidden="true" />
      <span className="text-[11px] font-bold uppercase tracking-wide">{media.type}</span>
    </span>
  );
};

const StatTile: React.FC<{ label: string; value: number; icon: React.ElementType }> = ({
  label,
  value,
  icon: Icon,
}) => (
  <div className="card flex items-center gap-3 p-3.5 sm:p-4">
    <span className="hidden h-10 w-10 shrink-0 sm:flex items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
      <Icon size={18} aria-hidden="true" />
    </span>
    <span className="min-w-0">
      <span className="block text-xl font-bold leading-tight text-ink tabular-nums">{value}</span>
      <span className="block text-xs font-medium text-ink-3">{label}</span>
    </span>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({
  patients,
  studyGroups,
  media,
  defaultSurgeon,
  onAddPatient,
  onSelectPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState<PatientDraft>(() => emptyPatientDraft(defaultSurgeon));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PatientDraftErrors>({});

  const filtered = patients.filter((p) => matchesPatientSearch(p, searchTerm));
  const recentActivity = useMemo(() => buildRecentActivity(media, patients), [media, patients]);
  const groupNames = useMemo(() => new Map(studyGroups.map((g) => [g.id, g.name])), [studyGroups]);
  const mediaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of media) counts.set(m.uhid, (counts.get(m.uhid) ?? 0) + 1);
    return counts;
  }, [media]);
  const procedureCount = patients.reduce((sum, p) => sum + p.surgeries.length, 0);

  const updateDraft = (changes: Partial<PatientDraft>) => {
    setDraft((prev) => ({ ...prev, ...changes }));
    // Clear a field's error as soon as the user edits it.
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(changes) as (keyof PatientDraft)[]) delete next[key];
      return next;
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validatePatientDraft(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await onAddPatient(draftToPatient(draft));
      setDraft(emptyPatientDraft(defaultSurgeon));
      setShowModal(false);
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to add patient.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-32 md:space-y-8 lg:pb-12">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Patient Registry</h1>
          <p className="page-subtitle">Manage clinical records and surgical media.</p>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="btn-primary w-full sm:w-auto">
          <Plus size={18} aria-hidden="true" />
          <span>Add Patient</span>
        </button>
      </div>

      {patients.length > 0 && (
        <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatTile label="Active patients" value={patients.length} icon={Users} />
          <StatTile label="Procedures" value={procedureCount} icon={Stethoscope} />
          <StatTile label="Media assets" value={media.length} icon={Images} />
          <StatTile label="Study groups" value={studyGroups.length} icon={Library} />
        </section>
      )}

      <div className="group relative">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4 transition-colors group-focus-within:text-brand-ink"
        />
        <input
          type="search"
          aria-label="Search patients by name or UHID"
          placeholder="Search by name or UHID…"
          className="field bg-surface pl-11 shadow-card"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {recentActivity.length > 0 && !searchTerm && (
        <section aria-labelledby="recent-activity" className="space-y-3">
          <h2 id="recent-activity" className="eyebrow">
            <Clock size={14} aria-hidden="true" /> Recent activity
          </h2>
          <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {recentActivity.map((entry) => {
              const patient =
                entry.kind === 'media'
                  ? patients.find((p) => p.uhid === entry.media.uhid)
                  : patients.find((p) => p.uhid === entry.uhid);
              const label =
                entry.kind === 'media'
                  ? `${entry.media.type} for ${patient?.name ?? entry.media.uhid}, ${entry.media.stage}`
                  : `Notes for ${entry.patientName}`;
              return (
                <li key={entry.id} className="shrink-0 snap-start">
                  <button
                    type="button"
                    disabled={!patient}
                    onClick={() => patient && onSelectPatient(patient)}
                    aria-label={label}
                    className="group relative block h-32 w-32 overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-card transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-raised md:h-36 md:w-36"
                  >
                    {entry.kind === 'media' ? (
                      <>
                        <ActivityTile media={entry.media} />
                        <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3">
                          <span className="truncate font-mono text-xs font-medium text-white">{entry.media.uhid}</span>
                          <span className="truncate text-[11px] text-white/80">{entry.media.stage}</span>
                        </span>
                      </>
                    ) : (
                      <span className="flex h-full w-full flex-col justify-between bg-surface-2 p-3.5">
                        <FileText size={16} className="text-brand-ink" aria-hidden="true" />
                        <span className="line-clamp-3 text-xs italic leading-relaxed text-ink-2">
                          &ldquo;{entry.notes}&rdquo;
                        </span>
                        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                          {entry.patientName}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="patients-heading" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="patients-heading" className="eyebrow">
            <Users size={14} aria-hidden="true" /> Patients
          </h2>
          {patients.length > 0 && (
            <p className="text-xs text-ink-3" aria-live="polite">
              {searchTerm ? `${filtered.length} of ${patients.length} shown` : `${patients.length} total`}
            </p>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="card">
            {patients.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="No patients registered yet"
                description="Add your first patient to start recording surgical media and notes."
                action={
                  <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
                    <Plus size={18} aria-hidden="true" /> Add Patient
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No patients match your search"
                description={`Nothing found for “${searchTerm.trim()}”. Try a different name or UHID.`}
                action={
                  <button type="button" onClick={() => setSearchTerm('')} className="btn-secondary">
                    Clear search
                  </button>
                }
              />
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const pod = patientPostOpDay(p);
              const assets = mediaCounts.get(p.uhid) ?? 0;
              return (
                <li key={p.uhid}>
                  <button
                    type="button"
                    onClick={() => onSelectPatient(p)}
                    className="card group flex h-full w-full flex-col gap-4 p-5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-line hover:shadow-raised"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-base font-bold text-ink-2 transition-colors group-hover:bg-brand-soft group-hover:text-brand-ink"
                        >
                          {initials(p.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-base font-semibold leading-tight text-ink">
                            {p.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-xs text-ink-3">{p.uhid}</span>
                        </span>
                      </span>
                      {pod !== null && (
                        <span className="badge-brand shrink-0" title="Post-operative day">
                          POD {pod}
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-ink-2">
                      {p.diagnosis || 'No diagnosis recorded'}
                    </span>
                    <span className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-ink-3">
                      <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Images size={14} aria-hidden="true" />
                          {assets} asset{assets === 1 ? '' : 's'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Stethoscope size={14} aria-hidden="true" />
                          {p.surgeries.length} procedure{p.surgeries.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {p.studyGroupIds.length > 0 && (
                          <span className="flex -space-x-1.5">
                            {p.studyGroupIds.slice(0, 3).map((id) => {
                              const name = groupNames.get(id) ?? 'Study group';
                              return (
                                <span
                                  key={id}
                                  title={name}
                                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-brand-soft-2 text-[10px] font-bold uppercase text-brand-ink"
                                >
                                  {name.charAt(0)}
                                  <span className="sr-only">Study group: {name}</span>
                                </span>
                              );
                            })}
                            {p.studyGroupIds.length > 3 && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-3 text-[10px] font-bold text-ink-3">
                                +{p.studyGroupIds.length - 3}
                              </span>
                            )}
                          </span>
                        )}
                        <ChevronRight
                          size={16}
                          className="text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-ink"
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showModal && (
        <Modal
          title="New patient"
          description="Register a patient in your registry."
          onClose={closeModal}
          busy={isSubmitting}
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField label="UHID" required error={fieldErrors.uhid} hint="Hospital ID. Cannot be changed later.">
              {(a) => (
                <input
                  {...a}
                  autoComplete="off"
                  placeholder="e.g. HOSP-2025-001"
                  className="field font-mono"
                  value={draft.uhid}
                  onChange={(e) => updateDraft({ uhid: e.target.value })}
                />
              )}
            </FormField>
            <FormField label="Patient Name" required error={fieldErrors.name}>
              {(a) => (
                <input
                  {...a}
                  autoComplete="off"
                  placeholder="Full name"
                  className="field"
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                />
              )}
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Age (years)" error={fieldErrors.ageYears}>
                {(a) => (
                  <input
                    {...a}
                    type="number"
                    min={0}
                    max={130}
                    inputMode="numeric"
                    className="field"
                    value={draft.ageYears}
                    onChange={(e) => updateDraft({ ageYears: e.target.value })}
                  />
                )}
              </FormField>
              <FormField label="Gender">
                {(a) => (
                  <select
                    {...a}
                    className="field"
                    value={draft.gender}
                    onChange={(e) => updateDraft({ gender: e.target.value as Gender })}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Lead Surgeon">
                {(a) => (
                  <input
                    {...a}
                    className="field"
                    value={draft.primarySurgeon}
                    onChange={(e) => updateDraft({ primarySurgeon: e.target.value })}
                  />
                )}
              </FormField>
              <FormField
                label="Date of Surgery"
                error={fieldErrors.dateOfSurgery}
                hint="Optional. Creates a Primary Surgery."
              >
                {(a) => (
                  <input
                    {...a}
                    type="date"
                    max={todayIsoDate()}
                    className="field"
                    value={draft.dateOfSurgery}
                    onChange={(e) => updateDraft({ dateOfSurgery: e.target.value })}
                  />
                )}
              </FormField>
            </div>
            <FormField label="Clinical Diagnosis" required error={fieldErrors.diagnosis}>
              {(a) => (
                <textarea
                  {...a}
                  placeholder="Brief clinical findings…"
                  className="field h-24 resize-none"
                  value={draft.diagnosis}
                  onChange={(e) => updateDraft({ diagnosis: e.target.value })}
                />
              )}
            </FormField>
            {formError && (
              <p role="alert" className="alert-error">
                {formError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} disabled={isSubmitting} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Adding…' : 'Complete Enrollment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
