import React, { useMemo, useState } from 'react';
import { Search, Plus, User, ChevronRight, FileText, Clock, Video, Music, Users } from 'lucide-react';
import Modal from '../components/Modal';
import { MediaType } from '../types';
import type { Gender, MediaEntry, Patient, StudyGroup } from '../types';
import {
  buildRecentActivity,
  errorMessage,
  matchesPatientSearch,
  patientPostOpDay,
  todayIsoDate,
} from '../lib/clinical';
import { GENDERS, draftToPatient, emptyPatientDraft, type PatientDraft } from '../lib/patientDraft';

interface DashboardProps {
  patients: Patient[];
  studyGroups: StudyGroup[];
  media: MediaEntry[];
  /** Pre-fills the lead surgeon field for new patients. */
  defaultSurgeon: string;
  onAddPatient: (patient: Patient) => Promise<void>;
  onSelectPatient: (patient: Patient) => void;
}

const fieldClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all';
const labelClass = 'ml-1 text-xs font-semibold text-slate-600';

const ActivityTile: React.FC<{ media: MediaEntry }> = ({ media }) => {
  if (media.type === MediaType.IMAGE) {
    return (
      <img
        src={media.url}
        alt={`Clinical image for ${media.uhid}`}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  }
  const Icon = media.type === MediaType.VIDEO ? Video : media.type === MediaType.AUDIO ? Music : FileText;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500">
      <Icon size={28} aria-hidden="true" />
      <span className="text-[11px] font-bold uppercase">{media.type}</span>
    </div>
  );
};

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

  const filtered = patients.filter((p) => matchesPatientSearch(p, searchTerm));
  const recentActivity = useMemo(() => buildRecentActivity(media, patients), [media, patients]);
  const groupNames = useMemo(() => new Map(studyGroups.map((g) => [g.id, g.name])), [studyGroups]);

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.uhid.trim() || !draft.name.trim()) return;
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
    <div className="mx-auto max-w-6xl space-y-6 pb-32 duration-500 md:space-y-8 lg:pb-12">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Patient Registry</h1>
          <p className="mt-1 text-xs text-slate-500 md:text-sm">Manage clinical records and surgical media</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95 sm:w-auto"
        >
          <Plus size={18} aria-hidden="true" />
          <span>Add Patient</span>
        </button>
      </div>

      <div className="group relative">
        <Search
          size={18}
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-teal-600"
        />
        <input
          type="search"
          aria-label="Search patients by name or UHID"
          placeholder="Search by name or UHID..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {recentActivity.length > 0 && (
        <section aria-labelledby="recent-activity" className="space-y-3 md:space-y-4">
          <h2
            id="recent-activity"
            className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-slate-500 md:text-xs"
          >
            <Clock size={12} aria-hidden="true" /> Recent Activity
          </h2>
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:gap-4">
            {recentActivity.map((entry) => {
              const patient =
                entry.kind === 'media'
                  ? patients.find((p) => p.uhid === entry.media.uhid)
                  : patients.find((p) => p.uhid === entry.uhid);
              return (
                <li key={entry.id} className="flex-shrink-0">
                  <button
                    type="button"
                    disabled={!patient}
                    onClick={() => patient && onSelectPatient(patient)}
                    className="relative h-32 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:border-teal-200 md:h-40 md:w-40"
                  >
                    {entry.kind === 'media' ? (
                      <>
                        <ActivityTile media={entry.media} />
                        <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-3">
                          <span className="truncate font-mono text-[12px] font-medium text-white">
                            {entry.media.uhid}
                          </span>
                        </span>
                      </>
                    ) : (
                      <span className="flex h-full w-full flex-col justify-between bg-slate-50 p-4">
                        <FileText size={16} className="text-teal-600" aria-hidden="true" />
                        <span className="line-clamp-4 text-[13px] italic leading-relaxed text-slate-600">
                          &ldquo;{entry.notes}&rdquo;
                        </span>
                        <span className="truncate text-[12px] font-semibold uppercase tracking-tight text-slate-500">
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white py-20 text-center">
          <Users size={36} className="text-slate-200" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-500">
            {patients.length === 0 ? 'No patients registered yet' : 'No patients match your search'}
          </p>
          {patients.length === 0 && (
            <p className="text-xs text-slate-400">Use “Add Patient” to create the first record.</p>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {filtered.map((p) => {
            const pod = patientPostOpDay(p);
            return (
              <li key={p.uhid}>
                <button
                  type="button"
                  onClick={() => onSelectPatient(p)}
                  className="group flex h-full w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-teal-100 hover:shadow-md md:gap-4 md:p-6"
                >
                  <span className="flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-teal-50 group-hover:text-teal-600">
                      <User size={24} aria-hidden="true" />
                    </span>
                    {pod !== null && (
                      <span
                        className="rounded-full border border-teal-100 bg-teal-50 px-2 py-1 text-[12px] font-bold text-teal-700"
                        title="Post-operative day"
                      >
                        POD {pod}
                      </span>
                    )}
                  </span>
                  <span>
                    <span className="block text-lg font-bold leading-tight text-slate-900">{p.name}</span>
                    <span className="mt-1 block font-mono text-[13px] text-slate-500">{p.uhid}</span>
                  </span>
                  <span className="rounded-xl bg-slate-50 p-3">
                    <span className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {p.diagnosis || 'No diagnosis recorded'}
                    </span>
                  </span>
                  <span className="mt-auto flex items-center justify-between pt-2">
                    <span className="flex -space-x-2">
                      {p.studyGroupIds.slice(0, 3).map((id) => {
                        const name = groupNames.get(id) ?? 'Study group';
                        return (
                          <span
                            key={id}
                            title={name}
                            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-teal-100 text-[10px] font-bold uppercase text-teal-700"
                          >
                            {name.charAt(0)}
                          </span>
                        );
                      })}
                      {p.studyGroupIds.length > 3 && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-500">
                          +{p.studyGroupIds.length - 3}
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-slate-300 transition-colors group-hover:text-teal-500"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <Modal title="New Patient Enrollment" onClose={closeModal} busy={isSubmitting}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className={labelClass}>UHID Identifier</span>
              <input
                required
                placeholder="e.g. HOSP-2025-001"
                className={`${fieldClass} font-mono`}
                value={draft.uhid}
                onChange={(e) => setDraft({ ...draft, uhid: e.target.value })}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Patient Name</span>
              <input
                required
                placeholder="Full legal name"
                className={fieldClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className={labelClass}>Age (years)</span>
                <input
                  type="number"
                  min={0}
                  max={130}
                  inputMode="numeric"
                  className={fieldClass}
                  value={draft.ageYears}
                  onChange={(e) => setDraft({ ...draft, ageYears: e.target.value })}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Gender</span>
                <select
                  className={fieldClass}
                  value={draft.gender}
                  onChange={(e) => setDraft({ ...draft, gender: e.target.value as Gender })}
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className={labelClass}>Lead Surgeon</span>
                <input
                  className={fieldClass}
                  value={draft.primarySurgeon}
                  onChange={(e) => setDraft({ ...draft, primarySurgeon: e.target.value })}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Date of Surgery (optional)</span>
                <input
                  type="date"
                  max={todayIsoDate()}
                  className={fieldClass}
                  value={draft.dateOfSurgery}
                  onChange={(e) => setDraft({ ...draft, dateOfSurgery: e.target.value })}
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className={labelClass}>Clinical Diagnosis</span>
              <textarea
                required
                placeholder="Brief clinical findings..."
                className={`${fieldClass} h-24 resize-none md:h-28`}
                value={draft.diagnosis}
                onChange={(e) => setDraft({ ...draft, diagnosis: e.target.value })}
              />
            </label>
            {formError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 md:py-4"
            >
              {isSubmitting ? 'Adding…' : 'Complete Enrollment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
