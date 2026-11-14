import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Download,
  X,
  Edit,
  HardDrive,
  PlayCircle,
  Trash2,
  FileText,
  Plus,
  Shield,
  Cloud,
  RefreshCw,
  Zap,
  Maximize2,
  Music,
  ExternalLink,
} from 'lucide-react';
import { MediaType, StorageLocation, SurgicalStage } from '../types';
import type { MediaEntry, Patient, StudyGroup } from '../types';
import { initials, parseDate, patientPostOpDay } from '../lib/clinical';
import EmptyState from '../components/EmptyState';

interface PatientDetailsProps {
  patient: Patient;
  media: MediaEntry[];
  studyGroups: StudyGroup[];
  onBack: () => void;
  onAddMedia: () => void;
  onSyncMedia: (uhid: string, target: StorageLocation) => Promise<void>;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patient: Patient) => void;
}

const MediaThumb: React.FC<{ m: MediaEntry }> = ({ m }) => {
  switch (m.type) {
    case MediaType.VIDEO:
      return (
        <>
          <video
            src={m.url}
            muted
            playsInline
            preload="metadata"
            poster={m.thumbnailUrl}
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
            <span className="rounded-full bg-white/90 p-3 text-slate-900 shadow-lg transition-transform group-hover:scale-110">
              <PlayCircle size={24} aria-hidden="true" />
            </span>
          </span>
        </>
      );
    case MediaType.AUDIO:
    case MediaType.PDF: {
      const Icon = m.type === MediaType.AUDIO ? Music : FileText;
      return (
        <span className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="rounded-full border border-brand-line bg-surface p-4 text-brand-ink shadow-card">
            <Icon size={24} aria-hidden="true" />
          </span>
          <span className="w-full truncate text-[12px] font-semibold text-ink">
            {m.notes || (m.type === MediaType.AUDIO ? 'Voice memo' : 'PDF document')}
          </span>
        </span>
      );
    }
    default:
      return (
        <>
          <img
            src={m.url}
            loading="lazy"
            alt={`${m.stage} clinical image`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
            <Maximize2
              size={20}
              aria-hidden="true"
              className="text-white opacity-0 transition-opacity group-hover:opacity-100"
            />
          </span>
        </>
      );
  }
};

const MediaViewer: React.FC<{ media: MediaEntry; onClose: () => void }> = ({ media, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Portalled to <body> so the view's entry animation never clips the full-screen viewer.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${media.type} viewer`}
      className="fixed inset-0 z-[600] flex animate-fade-in flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md"
    >
      <button
        type="button"
        onClick={onClose}
        autoFocus
        aria-label="Close viewer"
        className="absolute right-4 top-4 z-10 rounded-full bg-surface/10 p-3 text-white transition-all hover:bg-surface/20 md:right-6 md:top-6"
      >
        <X size={22} aria-hidden="true" />
      </button>

      <div className="relative flex h-full w-full flex-col items-center justify-center p-4 md:p-6">
        {media.type === MediaType.VIDEO ? (
          <video
            src={media.url}
            controls
            autoPlay
            className="max-h-[70vh] max-w-full rounded-2xl border border-white/10 shadow-2xl md:max-h-[75vh]"
          />
        ) : media.type === MediaType.AUDIO ? (
          <div className="w-full max-w-sm space-y-6 rounded-3xl bg-surface p-8 text-center shadow-2xl md:max-w-md md:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-brand-line bg-brand-soft text-brand-ink">
              <Music size={32} aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-ink">Clinical Audio</h2>
              {media.notes && <p className="text-xs font-medium text-ink-3">{media.notes}</p>}
            </div>
            <audio src={media.url} controls className="w-full" />
          </div>
        ) : media.type === MediaType.PDF ? (
          <iframe
            src={media.url}
            title="PDF document"
            className="h-[75vh] w-full max-w-4xl rounded-2xl border border-white/10 bg-surface shadow-2xl"
          />
        ) : (
          <img
            src={media.url}
            className="max-h-[75vh] max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl md:max-h-[80vh]"
            alt={`${media.stage} clinical image, full size`}
          />
        )}

        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-surface/10 px-6 py-3 backdrop-blur-md md:mt-8 md:gap-6 md:px-8 md:py-4">
          <div className="text-left">
            <p className="text-xs font-bold text-white md:text-sm">{media.stage}</p>
            <p className="mt-1 text-xs font-medium text-slate-300">{new Date(media.uploadedAt).toLocaleString()}</p>
          </div>
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open original in a new tab"
            className="rounded-xl bg-white p-3 text-slate-900 shadow-lg transition-colors hover:bg-teal-100"
          >
            <ExternalLink size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const PatientDetails: React.FC<PatientDetailsProps> = ({
  patient,
  media,
  studyGroups,
  onBack,
  onAddMedia,
  onSyncMedia,
  onEditPatient,
  onDeletePatient,
}) => {
  const surgeries = useMemo(
    () => [...patient.surgeries].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()),
    [patient.surgeries],
  );
  const [activeSurgeryId, setActiveSurgeryId] = useState<string>(surgeries[0]?.id ?? '');
  const [activeStage, setActiveStage] = useState<SurgicalStage>(SurgicalStage.PRE_OP);
  const [viewerMedia, setViewerMedia] = useState<MediaEntry | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const currentSurgery = surgeries.find((s) => s.id === activeSurgeryId);
  const filteredMedia = media.filter((m) => m.surgeryId === activeSurgeryId && m.stage === activeStage);
  const unassignedMedia = media.filter((m) => !m.surgeryId || !surgeries.some((s) => s.id === m.surgeryId));
  const pod = patientPostOpDay(patient);
  const groups = studyGroups.filter((g) => patient.studyGroupIds.includes(g.id));

  const syncStats = useMemo(() => {
    const total = media.length;
    const cloud = media.filter((m) => m.storageLocation === StorageLocation.GOOGLE_DRIVE).length;
    return { total, cloud, local: total - cloud };
  }, [media]);

  const markSynced = async () => {
    setIsSyncing(true);
    try {
      await onSyncMedia(patient.uhid, StorageLocation.GOOGLE_DRIVE);
    } finally {
      setIsSyncing(false);
    }
  };

  const countFor = (stage: SurgicalStage) =>
    media.filter((m) => m.surgeryId === activeSurgeryId && m.stage === stage).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-32 lg:pb-12">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="btn-ghost -ml-2 px-2 text-ink-2">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Back to registry</span>
        </button>
        <button type="button" onClick={onAddMedia} className="btn-primary">
          <Plus size={18} aria-hidden="true" />
          <span>New Session</span>
        </button>
      </div>

      <section aria-labelledby="patient-name" className="card p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-xl font-bold text-brand-ink md:h-16 md:w-16 md:text-2xl"
            >
              {initials(patient.name)}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h1 id="patient-name" className="text-xl font-bold leading-tight text-ink md:text-2xl">
                {patient.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs font-medium text-ink-2">
                  {patient.uhid}
                </span>
                <span className="text-xs font-medium text-ink-3">
                  {patient.gender} · {patient.ageYears} y
                </span>
                {pod !== null && (
                  <span className="badge-brand" title="Post-operative day">
                    POD {pod}
                  </span>
                )}
              </div>
              <dl className="grid gap-x-6 gap-y-1 text-xs text-ink-3 sm:grid-cols-2">
                {patient.primarySurgeon && (
                  <div className="flex flex-wrap gap-x-1">
                    <dt>Lead surgeon:</dt>
                    <dd className="font-medium text-ink-2">{patient.primarySurgeon}</dd>
                  </div>
                )}
                {groups.length > 0 && (
                  <div className="flex flex-wrap gap-x-1">
                    <dt>Study groups:</dt>
                    <dd className="font-medium text-ink-2">{groups.map((g) => g.name).join(', ')}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => onEditPatient(patient)} className="btn-secondary flex-1 md:flex-none">
              <Edit size={16} aria-hidden="true" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => onDeletePatient(patient)}
              aria-label="Archive patient record"
              className="btn-secondary flex-1 hover:border-danger-line hover:text-danger-ink md:flex-none"
            >
              <Trash2 size={16} aria-hidden="true" />
              <span>Archive</span>
            </button>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4">
          <p className="eyebrow mb-1 text-[11px]">Diagnosis</p>
          <p className="text-sm leading-relaxed text-ink-2">{patient.diagnosis || 'No diagnosis recorded.'}</p>
        </div>
      </section>

      {/* Storage tracking: records where assets have been archived (metadata only). */}
      <section
        aria-label="Archive tracking"
        className="flex flex-col items-stretch justify-between gap-4 rounded-2xl bg-inverse p-5 text-white shadow-raised sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white/10 p-3 text-teal-300">
            <RefreshCw size={18} aria-hidden="true" className={isSyncing ? 'animate-spin' : ''} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Archive tracking</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-teal-300">
                <Cloud size={12} aria-hidden="true" /> {syncStats.cloud} on Drive
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <HardDrive size={12} aria-hidden="true" /> {syncStats.local} vault only
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={markSynced}
          disabled={isSyncing || syncStats.local === 0}
          className={`btn ${syncStats.local === 0 ? 'bg-white/10 text-slate-300 disabled:opacity-100' : 'bg-white text-slate-900 hover:bg-teal-50'}`}
        >
          {isSyncing ? 'Updating…' : syncStats.local === 0 ? 'All tracked' : 'Mark all as on Drive'}
        </button>
      </section>

      <section aria-labelledby="procedures" className="space-y-3">
        <h2 id="procedures" className="eyebrow">
          <Zap size={14} aria-hidden="true" /> Procedure history
        </h2>
        {surgeries.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Zap}
              title="No procedures yet"
              description="Start a new session to record the first procedure for this patient."
              action={
                <button type="button" onClick={onAddMedia} className="btn-primary">
                  <Plus size={16} aria-hidden="true" /> New Session
                </button>
              }
            />
          </div>
        ) : (
          <div
            className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
            role="tablist"
            aria-label="Procedures"
          >
            {surgeries.map((s) => {
              const selected = activeSurgeryId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveSurgeryId(s.id)}
                  className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${selected ? 'border-brand bg-brand text-white shadow-card' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'}`}
                >
                  {s.title} <span className="font-normal opacity-80">· {s.date}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section aria-label="Media gallery" className="card overflow-hidden lg:col-span-8">
          <div
            className="flex gap-1 border-b border-line bg-surface-2 p-1.5"
            role="tablist"
            aria-label="Surgical stage"
          >
            {Object.values(SurgicalStage).map((stage) => {
              const selected = activeStage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveStage(stage)}
                  className={`min-h-11 flex-1 rounded-xl px-1 py-2 text-xs font-semibold transition-colors sm:text-sm ${selected ? 'bg-surface text-brand-ink shadow-card ring-1 ring-line' : 'text-ink-3 hover:text-ink'}`}
                >
                  <span className="sm:hidden">{stage.replace('-operative', '-op')}</span>
                  <span className="hidden sm:inline">{stage}</span>{' '}
                  <span className="font-normal tabular-nums">({countFor(stage)})</span>
                </button>
              );
            })}
          </div>
          <div className="p-4 sm:p-5">
            {filteredMedia.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No assets in this stage"
                description="Start a new session to add photos, video, audio or PDFs for this stage."
                className="py-12"
              />
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {filteredMedia.map((m) => (
                  <li
                    key={m.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2 shadow-card transition-shadow hover:shadow-raised"
                  >
                    <button
                      type="button"
                      onClick={() => setViewerMedia(m)}
                      aria-label={`Open ${m.type} from ${new Date(m.uploadedAt).toLocaleDateString()}`}
                      className="relative flex h-full w-full items-center justify-center"
                    >
                      <MediaThumb m={m} />
                    </button>
                    <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md border border-line bg-surface/90 px-2 py-1 shadow-card backdrop-blur-sm">
                      {m.storageLocation === StorageLocation.GOOGLE_DRIVE ? (
                        <Cloud size={11} className="text-brand-ink" aria-hidden="true" />
                      ) : (
                        <HardDrive size={11} className="text-ink-3" aria-hidden="true" />
                      )}
                      <span className="text-[11px] font-bold uppercase tracking-tight text-ink-2">{m.type}</span>
                    </span>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Download ${m.type}`}
                      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface/90 text-ink-2 shadow-card backdrop-blur-sm transition-[opacity,background-color,color] hover:bg-brand hover:text-white focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Download size={15} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {unassignedMedia.length > 0 && (
              <p className="mt-4 text-xs text-ink-3">
                {unassignedMedia.length} asset{unassignedMedia.length === 1 ? ' is' : 's are'} not linked to a
                procedure.
              </p>
            )}
          </div>
        </section>

        <aside aria-labelledby="notes-heading" className="card space-y-4 p-5 lg:col-span-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-soft p-2.5 text-brand-ink">
              <Shield size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="notes-heading" className="text-sm font-semibold text-ink">
                Operative notes
              </h2>
              <p className="truncate text-xs text-ink-3">{currentSurgery?.title ?? 'No procedure selected'}</p>
            </div>
          </div>
          <div className="relative min-h-[180px] overflow-hidden rounded-xl border border-line bg-surface-2 p-4 pl-5">
            <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent/40" aria-hidden="true" />
            {currentSurgery?.otNotes ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{currentSurgery.otNotes}</p>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
                <p className="text-sm font-medium text-ink-3">No notes recorded</p>
                <button type="button" onClick={onAddMedia} className="btn-secondary min-h-9 px-3 py-1.5 text-xs">
                  Add notes
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {viewerMedia && <MediaViewer media={viewerMedia} onClose={() => setViewerMedia(null)} />}
    </div>
  );
};

export default PatientDetails;
