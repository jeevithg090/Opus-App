import React from 'react';
import { Edit3, Library, Plus } from 'lucide-react';
import type { StudyGroup } from '../types';

interface StudyGroupsViewProps {
  studyGroups: StudyGroup[];
  onCreate: () => void;
  onEdit: (group: StudyGroup) => void;
  onOpen: (groupId: string) => void;
}

const StudyGroupsView: React.FC<StudyGroupsViewProps> = ({ studyGroups, onCreate, onEdit, onOpen }) => (
  <div className="mx-auto max-w-7xl space-y-6 pb-32 md:space-y-8 lg:pb-12">
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="space-y-1">
        <h1 className="text-2xl font-black uppercase italic leading-none tracking-tight text-slate-900 md:text-3xl">
          Research Units
        </h1>
        <p className="text-[12px] font-bold uppercase tracking-[0.4em] text-slate-500">Cohort Management</p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-[12px] font-black uppercase tracking-widest text-white shadow-2xl transition-all active:scale-95 sm:w-auto md:px-8 md:py-4"
      >
        <Plus size={18} aria-hidden="true" /> Create Cohort
      </button>
    </div>

    {studyGroups.length === 0 ? (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-100 bg-white py-24 text-center">
        <Library size={40} className="text-slate-200" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-500">No study groups yet</p>
        <p className="text-xs text-slate-400">Create a cohort to start grouping patients for research.</p>
      </div>
    ) : (
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
        {studyGroups.map((group) => (
          <li
            key={group.id}
            className="group relative flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl md:rounded-[2.5rem] md:p-8"
          >
            <button
              type="button"
              onClick={() => onEdit(group)}
              aria-label={`Edit ${group.name}`}
              className="absolute right-6 top-6 z-10 rounded-xl border border-transparent bg-slate-50 p-2.5 text-slate-500 transition-all hover:border-teal-100 hover:bg-teal-50 hover:text-teal-600 md:right-8 md:top-8"
            >
              <Edit3 size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onOpen(group.id)} className="flex flex-1 flex-col text-left">
              <h2 className="mb-3 pr-12 text-lg font-black uppercase italic leading-tight text-slate-900 transition-colors group-hover:text-teal-700 md:mb-4 md:text-xl">
                {group.name}
              </h2>
              <p className="mb-8 line-clamp-2 text-xs italic leading-relaxed text-slate-500 md:mb-10 md:text-sm">
                {group.description}
              </p>
              <span className="mt-auto flex w-full items-center justify-between">
                <span className="inline-flex items-center rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-teal-700">
                  {group.patientCount} {group.patientCount === 1 ? 'Record' : 'Records'}
                </span>
                <span className="text-[12px] font-black uppercase italic tracking-widest text-slate-400 transition-colors group-hover:text-teal-600">
                  Enter Unit &rarr;
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default StudyGroupsView;
