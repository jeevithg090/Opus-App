import React from 'react';
import { Trash2, RotateCcw, AlertCircle, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';
import type { Patient } from '../types';
import { ARCHIVE_RETENTION_DAYS, retentionDaysRemaining } from '../lib/clinical';

interface RecycleBinProps {
  deletedPatients: Patient[];
  onRestore: (patient: Patient) => void;
  onPermanentDelete: (patient: Patient) => void;
  onBack?: () => void;
}

const RecycleBin: React.FC<RecycleBinProps> = ({ deletedPatients, onRestore, onPermanentDelete, onBack }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-8 duration-500 pb-32 lg:pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-bold text-teal-600 hover:text-slate-900 transition-colors group py-1"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Archive</h1>
            <p className="text-slate-500 text-sm mt-1">
              Archived records are kept for {ARCHIVE_RETENTION_DAYS} days and can be restored at any time before being
              purged.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl shadow-sm">
          <AlertCircle size={16} className="text-amber-500 shrink-0" />
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            {ARCHIVE_RETENTION_DAYS}-day retention
          </span>
        </div>
      </div>

      {/* Mobile-Native Archive Cards */}
      <div className="flex flex-col gap-4 md:hidden">
        {deletedPatients.length > 0 ? (
          deletedPatients.map((p) => {
            const daysLeft = retentionDaysRemaining(p.deletedAt ?? '');
            return (
              <div key={p.uhid} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 text-teal-400 rounded-xl flex items-center justify-center font-bold text-sm">
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">{p.uhid}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Archived On</span>
                    <span className="text-xs font-medium text-slate-600">
                      {new Date(p.deletedAt ?? '').toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Retention</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${daysLeft <= 5 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {daysLeft} Days
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onRestore(p)}
                    className="flex items-center justify-center gap-2 py-3 text-teal-600 bg-teal-50 border border-teal-100 rounded-xl transition-all text-xs font-bold active:scale-95"
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                  <button
                    onClick={() => onPermanentDelete(p)}
                    className="flex items-center justify-center gap-2 py-3 text-red-500 bg-red-50 border border-red-100 rounded-xl transition-all text-xs font-bold active:scale-95"
                  >
                    <Trash2 size={14} /> Purge
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-24 text-center space-y-4 bg-white rounded-2xl border border-slate-100">
            <Trash2 size={40} className="mx-auto text-slate-200" />
            <p className="text-sm font-bold text-slate-400">Archive Empty</p>
          </div>
        )}
      </div>

      {/* Desktop Table - Hidden on Mobile */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-4 text-left text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                  Record Identity
                </th>
                <th className="px-8 py-4 text-left text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                  Archival Date
                </th>
                <th className="px-8 py-4 text-left text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                  Retention Remaining
                </th>
                <th className="px-8 py-4 text-right text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deletedPatients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-sm font-bold text-slate-400">
                    Archive empty
                  </td>
                </tr>
              )}
              {deletedPatients.map((p) => {
                const daysLeft = retentionDaysRemaining(p.deletedAt ?? '');
                return (
                  <tr key={p.uhid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold text-sm group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-none">{p.name}</p>
                          <p className="text-[12px] font-mono text-slate-400 mt-1">{p.uhid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-medium text-slate-500">
                        {new Date(p.deletedAt ?? '').toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className={daysLeft <= 5 ? 'text-red-500' : 'text-slate-400'} />
                        <span
                          className={`text-xs font-bold ${daysLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}
                        >
                          {daysLeft} Days remaining
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right space-x-2">
                      <button
                        onClick={() => onRestore(p)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all text-xs font-bold border border-slate-100 hover:border-teal-200"
                      >
                        <RotateCcw size={14} /> Restore
                      </button>
                      <button
                        onClick={() => onPermanentDelete(p)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-all text-xs font-bold border border-slate-100 hover:border-red-200"
                      >
                        <Trash2 size={14} /> Purge
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-900 text-slate-400 p-8 rounded-3xl shadow-xl border border-slate-800">
        <div className="p-4 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/20">
          <ShieldCheck size={32} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-white uppercase tracking-wider">Archive Protocol</p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Archived records are hidden from the registry but remain recoverable. Purging permanently deletes the record
            together with its surgeries, media entries and study-group memberships.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecycleBin;
