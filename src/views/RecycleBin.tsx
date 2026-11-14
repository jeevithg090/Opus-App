import React from 'react';
import { Trash2, RotateCcw, Clock, ShieldCheck, ArrowLeft, Archive } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import type { Patient } from '../types';
import { ARCHIVE_RETENTION_DAYS, retentionDaysRemaining } from '../lib/clinical';

interface RecycleBinProps {
  deletedPatients: Patient[];
  onRestore: (patient: Patient) => void;
  onPermanentDelete: (patient: Patient) => void;
  onBack?: () => void;
}

const formatDate = (iso?: string) =>
  new Date(iso ?? '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const RetentionBadge: React.FC<{ daysLeft: number }> = ({ daysLeft }) => {
  const urgent = daysLeft <= 5;
  return (
    <span
      className={`badge ${urgent ? 'border-danger-line bg-danger-soft text-danger-ink' : 'border-line bg-surface-2 text-ink-2'}`}
    >
      <Clock size={12} aria-hidden="true" />
      {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
    </span>
  );
};

const RecycleBin: React.FC<RecycleBinProps> = ({ deletedPatients, onRestore, onPermanentDelete, onBack }) => (
  <div className="mx-auto max-w-6xl space-y-6 pb-32 lg:pb-12">
    {onBack && (
      <button type="button" onClick={onBack} className="btn-ghost -ml-2 px-2 text-ink-2 lg:hidden">
        <ArrowLeft size={18} aria-hidden="true" /> Back to registry
      </button>
    )}
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 className="page-title">Archive</h1>
        <p className="page-subtitle max-w-2xl">
          Archived records are hidden from the registry and can be restored at any time.
        </p>
      </div>
      <span className="badge border-warn-line bg-warn-soft text-warn-ink">
        <Clock size={12} aria-hidden="true" /> {ARCHIVE_RETENTION_DAYS}-day retention
      </span>
    </div>

    {deletedPatients.length === 0 ? (
      <div className="card">
        <EmptyState
          icon={Archive}
          title="The archive is empty"
          description="Patients you archive from their record page will appear here."
        />
      </div>
    ) : (
      <>
        {/* Phones: cards */}
        <ul className="space-y-3 md:hidden">
          {deletedPatients.map((p) => (
            <li key={p.uhid} className="card space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink">{p.name}</p>
                  <p className="truncate font-mono text-xs text-ink-3">{p.uhid}</p>
                </div>
                <RetentionBadge daysLeft={retentionDaysRemaining(p.deletedAt ?? '')} />
              </div>
              <p className="text-xs text-ink-3">Archived {formatDate(p.deletedAt)}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onRestore(p)} className="btn-secondary">
                  <RotateCcw size={16} aria-hidden="true" /> Restore
                </button>
                <button
                  type="button"
                  onClick={() => onPermanentDelete(p)}
                  className="btn-secondary text-danger-ink hover:border-danger-line hover:text-danger-ink"
                >
                  <Trash2 size={16} aria-hidden="true" /> Purge
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Tablet and up: table */}
        <div className="card hidden overflow-hidden md:block">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Archived patient records</caption>
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
                  Patient
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
                  Archived
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
                  Retention
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {deletedPatients.map((p) => (
                <tr key={p.uhid} className="transition-colors hover:bg-surface-2">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    <p className="font-mono text-xs text-ink-3">{p.uhid}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-2">{formatDate(p.deletedAt)}</td>
                  <td className="px-5 py-4">
                    <RetentionBadge daysLeft={retentionDaysRemaining(p.deletedAt ?? '')} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onRestore(p)}
                        className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                      >
                        <RotateCcw size={14} aria-hidden="true" /> Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => onPermanentDelete(p)}
                        className="btn-secondary min-h-9 px-3 py-1.5 text-xs text-danger-ink hover:border-danger-line hover:text-danger-ink"
                      >
                        <Trash2 size={14} aria-hidden="true" /> Purge
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

    <aside className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="w-fit rounded-xl bg-brand-soft p-3 text-brand-ink">
        <ShieldCheck size={22} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">How archiving works</p>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-3">
          Archived records stay recoverable. Purging permanently deletes the record together with its surgeries, media
          entries and study-group memberships, and requires typing the patient&apos;s UHID to confirm.
        </p>
      </div>
    </aside>
  </div>
);

export default RecycleBin;
