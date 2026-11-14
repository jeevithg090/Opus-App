import React from 'react';
import { ArrowRight, Edit3, Library, Plus, Users } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import type { StudyGroup } from '../types';

interface StudyGroupsViewProps {
  studyGroups: StudyGroup[];
  onCreate: () => void;
  onEdit: (group: StudyGroup) => void;
  onOpen: (groupId: string) => void;
}

const StudyGroupsView: React.FC<StudyGroupsViewProps> = ({ studyGroups, onCreate, onEdit, onOpen }) => (
  <div className="mx-auto max-w-6xl space-y-6 pb-32 md:space-y-8 lg:pb-12">
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="page-title">Study Groups</h1>
        <p className="page-subtitle">Organise patients into research cohorts.</p>
      </div>
      <button type="button" onClick={onCreate} className="btn-primary w-full sm:w-auto">
        <Plus size={18} aria-hidden="true" /> Create Group
      </button>
    </div>

    {studyGroups.length === 0 ? (
      <div className="card">
        <EmptyState
          icon={Library}
          title="No study groups yet"
          description="Create a group to start enrolling patients into a research cohort."
          action={
            <button type="button" onClick={onCreate} className="btn-primary">
              <Plus size={18} aria-hidden="true" /> Create Group
            </button>
          }
        />
      </div>
    ) : (
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {studyGroups.map((group) => (
          <li
            key={group.id}
            className="card group relative flex flex-col transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-line hover:shadow-raised"
          >
            <button
              type="button"
              onClick={() => onOpen(group.id)}
              className="flex flex-1 flex-col gap-4 rounded-2xl p-5 text-left"
            >
              <span className="flex items-center gap-3 pr-12">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                  <Library size={18} aria-hidden="true" />
                </span>
                <span className="text-base font-semibold leading-tight text-ink">{group.name}</span>
              </span>
              <span className="line-clamp-3 text-sm leading-relaxed text-ink-3">
                {group.description || 'No protocol notes.'}
              </span>
              <span className="mt-auto flex items-center justify-between border-t border-line pt-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                  <Users size={14} aria-hidden="true" />
                  {group.patientCount} {group.patientCount === 1 ? 'patient' : 'patients'}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-brand-ink">
                  Open
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(group)}
              aria-label={`Edit ${group.name}`}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <Edit3 size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default StudyGroupsView;
