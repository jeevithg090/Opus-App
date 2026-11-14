import React from 'react';
import { ShieldCheck, Clock, Search, ArrowLeft, ScrollText } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import type { AuditEntry } from '../types';
import { filterAuditLogs } from '../lib/clinical';

interface AuditTrailProps {
  logs: AuditEntry[];
  error?: string | null;
  onBack?: () => void;
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

const AuditTrail: React.FC<AuditTrailProps> = ({ logs, error, onBack }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const filteredLogs = React.useMemo(() => filterAuditLogs(logs, searchTerm), [logs, searchTerm]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-32 lg:pb-12">
      {onBack && (
        <button type="button" onClick={onBack} className="btn-ghost -ml-2 px-2 text-ink-2 lg:hidden">
          <ArrowLeft size={18} aria-hidden="true" /> Back to registry
        </button>
      )}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Append-only record of every change to clinical data.</p>
        </div>
        <span className="badge-brand">
          <ShieldCheck size={12} aria-hidden="true" /> Append-only log
        </span>
      </div>

      {error && (
        <p role="alert" className="alert-error">
          Audit log could not be loaded: {error}
        </p>
      )}

      {logs.length > 0 && (
        <div className="group relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4 transition-colors group-focus-within:text-brand-ink"
            size={18}
          />
          <input
            type="search"
            aria-label="Filter audit log"
            placeholder="Filter by user, action, record or details…"
            className="field bg-surface pl-11 shadow-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {filteredLogs.length === 0 ? (
        <div className="card">
          {logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No audit entries yet"
              description="Actions such as registering patients, uploads and archiving will appear here."
            />
          ) : (
            <EmptyState icon={Search} title="No entries match your filter" />
          )}
        </div>
      ) : (
        <>
          {/* Phones: timeline cards */}
          <ul className="space-y-3 md:hidden">
            {filteredLogs.map((log) => (
              <li key={log.id} className="card space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">{log.action}</p>
                  <time dateTime={log.timestamp} className="shrink-0 text-right text-xs text-ink-3">
                    {formatDate(log.timestamp)} · {formatTime(log.timestamp)}
                  </time>
                </div>
                <p className="text-sm leading-relaxed text-ink-2">{log.details}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-ink-3">
                  <span className="font-medium text-ink-2">{log.userName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono">
                    {log.targetId}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet and up: table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Audit log entries, newest first</caption>
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
                    Action
                  </th>
                  <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
                    Record
                  </th>
                  <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-3"
                  >
                    When
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="align-top transition-colors hover:bg-surface-2">
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">{log.action}</p>
                      <p className="mt-1 max-w-md text-sm text-ink-2">{log.details}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="whitespace-nowrap rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-xs text-ink-2">
                        {log.targetId}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-ink">{log.userName}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <time dateTime={log.timestamp} className="flex flex-col items-end gap-0.5">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-ink-2">
                          <Clock size={13} className="text-ink-4" aria-hidden="true" />
                          {formatTime(log.timestamp)}
                        </span>
                        <span className="text-xs text-ink-3">{formatDate(log.timestamp)}</span>
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditTrail;
