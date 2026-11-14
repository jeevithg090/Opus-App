import React, { useEffect, useMemo, useState } from 'react';
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
import { parseDate, patientPostOpDay } from '../lib/clinical';

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
          <span className="rounded-full border border-teal-100 bg-white p-4 text-teal-600 shadow-sm">
            <Icon size={24} aria-hidden="true" />
          </span>
          <span className="w-full truncate text-[12px] font-semibold text-slate-900">
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${media.type} viewer`}
      className="fixed inset-0 z-[600] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md duration-300"
    >
      <button
        type="button"
        onClick={onClose}
        autoFocus
        aria-label="Close viewer"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 text-white transition-all hover:bg-white/20 md:right-6 md:top-6"
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
          <div className="w-full max-w-sm space-y-6 rounded-3xl bg-white p-8 text-center shadow-2xl md:max-w-md md:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-600">
              <Music size={32} aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900">Clinical Audio</h2>
              {media.notes && <p className="text-xs font-medium text-slate-500">{media.notes}</p>}
            </div>
            <audio src={media.url} controls className="w-full" />
          </div>
        ) : media.type === MediaType.PDF ? (
          <iframe
            src={media.url}
            title="PDF document"
            className="h-[75vh] w-full max-w-4xl rounded-2xl border border-white/10 bg-white shadow-2xl"
          />
        ) : (
          <img
            src={media.url}
            className="max-h-[75vh] max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl md:max-h-[80vh]"
            alt={`${media.stage} clinical image, full size`}
          />
        )}

        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 backdrop-blur-md md:mt-8 md:gap-6 md:px-8 md:py-4">
          <div className="text-left">
            <p className="text-xs font-bold text-white md:text-sm">{media.stage}</p>
            <p className="mt-1 text-[12px] font-medium text-slate-300">{new Date(media.uploadedAt).toLocaleString()}</p>
          </div>
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open original in a new tab"
            className="rounded-xl bg-white p-3 text-slate-900 shadow-lg transition-all hover:bg-teal-500 hover:text-white"
          >
            <ExternalLink size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
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
    <div className="mx-auto max-w-6xl space-y-6 pb-32 duration-500 md:space-y-8 lg:pb-12">
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to registry"
            className="group rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition-all hover:border-teal-100 hover:text-teal-600 active:scale-95"
          >
            <ArrowLeft size={20} aria-hidden="true" className="transition-transform group-hover:-translate-x-1" />
          </button>
          <button
            type="button"
            onClick={onAddMedia}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95 md:px-6"
          >
            <Plus size={18} aria-hidden="true" />
            <span>New Session</span>
          </button>
        </div>

        <div className="flex flex-col items-start gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:gap-8 md:p-8">
          <div className="flex w-full items-center gap-4 md:gap-5">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-50 bg-slate-100 text-xl font-bold text-teal-600 shadow-sm md:h-16 md:w-16 md:text-2xl"
            >
              {patient.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="truncate text-xl font-bold leading-tight text-slate-900 md:text-2xl">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="rounded border border-slate-100 bg-slate-50 px-2 py-0.5 font-mono text-[12px] font-medium text-slate-500 md:text-xs">
                  {patient.uhid}
                </span>
                <span className="text-[12px] font-medium text-slate-500 md:text-xs">
                  {patient.gender} • {patient.ageYears}Y
                </span>
                {pod !== null && (
                  <span className="rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[12px] font-bold text-teal-700">
                    POD {pod}
                  </span>
                )}
              </div>
              {patient.primarySurgeon && (
                <p className="text-xs text-slate-500">Lead surgeon: {patient.primarySurgeon}</p>
              )}
              {groups.length > 0 && (
                <p className="text-xs text-slate-500">Study groups: {groups.map((g) => g.name).join(', ')}</p>
              )}
            </div>
          </div>
          <div className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs italic leading-relaxed text-slate-600 md:text-sm">
            {patient.diagnosis || 'No diagnosis recorded.'}
          </div>
          <div className="flex w-full shrink-0 gap-2 md:w-auto">
            <button
              type="button"
              onClick={() => onEditPatient(patient)}
              aria-label="Edit patient record"
              className="flex flex-1 justify-center rounded-xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm transition-all hover:border-teal-100 hover:text-teal-600 active:scale-95 md:flex-none"
            >
              <Edit size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDeletePatient(patient)}
              aria-label="Archive patient record"
              className="flex flex-1 justify-center rounded-xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm transition-all hover:border-red-100 hover:text-red-500 active:scale-95 md:flex-none"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Storage tracking: records where assets have been archived (metadata only). */}
      <div className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-white/5 bg-slate-900 p-5 shadow-lg sm:flex-row md:gap-6 md:p-6">
        <div className="flex w-full items-center gap-4 sm:w-auto">
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-3 text-teal-400">
            <RefreshCw size={18} aria-hidden="true" className={isSyncing ? 'animate-spin' : ''} />
          </div>
          <div className="space-y-1">
            <p className="text-[12px] font-bold uppercase tracking-wider text-white md:text-xs">Archive Tracking</p>
            <div className="flex gap-3 md:gap-4">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-teal-400">
                <Cloud size={10} aria-hidden="true" /> {syncStats.cloud} on Drive
              </span>
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-300">
                <HardDrive size={10} aria-hidden="true" /> {syncStats.local} vault only
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={markSynced}
          disabled={isSyncing || syncStats.local === 0}
          className={`w-full rounded-xl px-6 py-3 text-[13px] font-bold transition-all active:scale-95 sm:w-auto md:px-8 md:text-xs ${syncStats.local === 0 ? 'cursor-not-allowed bg-slate-800 text-slate-400' : 'bg-teal-600 text-white shadow-lg shadow-teal-900/20 hover:bg-teal-500'}`}
        >
          {isSyncing ? 'Updating…' : syncStats.local === 0 ? 'All tracked' : 'Mark all as on Drive'}
        </button>
      </div>

      <section aria-labelledby="procedures" className="space-y-3">
        <h2
          id="procedures"
          className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"
        >
          <Zap size={14} className="text-teal-500" aria-hidden="true" /> Procedure History
        </h2>
        {surgeries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-500">
            No procedures yet. Start a new session to add one.
          </p>
        ) : (
          <div
            className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth pb-2"
            role="tablist"
            aria-label="Procedures"
          >
            {surgeries.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activeSurgeryId === s.id}
                onClick={() => setActiveSurgeryId(s.id)}
                className={`flex-shrink-0 rounded-xl border px-5 py-2.5 text-xs font-semibold transition-all ${activeSurgeryId === s.id ? 'border-slate-900 bg-slate-900 text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
              >
                {s.title} <span className="font-normal opacity-70">· {s.date}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section
          aria-label="Media gallery"
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-8"
        >
          <div
            className="flex gap-1 border-b border-slate-200 bg-slate-50 p-1.5"
            role="tablist"
            aria-label="Surgical stage"
          >
            {Object.values(SurgicalStage).map((stage) => (
              <button
                key={stage}
                type="button"
                role="tab"
                aria-selected={activeStage === stage}
                onClick={() => setActiveStage(stage)}
                className={`flex-1 rounded-xl px-1 py-2.5 text-[12px] font-bold transition-all sm:text-[13px] ${activeStage === stage ? 'border border-slate-200 bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {stage} <span className="font-normal">({countFor(stage)})</span>
              </button>
            ))}
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {filteredMedia.map((m) => (
                <div
                  key={m.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-all hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => setViewerMedia(m)}
                    aria-label={`Open ${m.type} from ${new Date(m.uploadedAt).toLocaleDateString()}`}
                    className="relative flex h-full w-full items-center justify-center"
                  >
                    <MediaThumb m={m} />
                  </button>
                  <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
                    {m.storageLocation === StorageLocation.GOOGLE_DRIVE ? (
                      <Cloud size={10} className="text-teal-600" aria-hidden="true" />
                    ) : (
                      <HardDrive size={10} className="text-slate-500" aria-hidden="true" />
                    )}
                    <span className="text-[11px] font-bold uppercase tracking-tight text-slate-600">{m.type}</span>
                  </span>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${m.type}`}
                    className="absolute right-3 top-3 rounded-lg border border-slate-200 bg-white/90 p-2 text-slate-700 opacity-100 shadow-md backdrop-blur-sm transition-all hover:bg-slate-900 hover:text-white focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Download size={14} aria-hidden="true" />
                  </a>
                </div>
              ))}
              {filteredMedia.length === 0 && (
                <div className="col-span-full space-y-4 py-20 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-300">
                    <FileText size={28} aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500">No assets in this stage</p>
                    <p className="text-[12px] text-slate-400">Upload new media to populate this segment</p>
                  </div>
                </div>
              )}
            </div>
            {unassignedMedia.length > 0 && (
              <p className="mt-4 text-[12px] text-slate-500">
                {unassignedMedia.length} asset{unassignedMedia.length === 1 ? ' is' : 's are'} not linked to a
                procedure.
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-teal-100 bg-teal-50 p-2.5 text-teal-600">
              <Shield size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-none text-slate-900">Operative Notes</h2>
              <p className="mt-1 text-[12px] font-semibold text-slate-500">
                {currentSurgery?.title ?? 'No procedure selected'}
              </p>
            </div>
          </div>
          <div className="group relative min-h-[200px] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="absolute left-0 top-0 h-full w-1 bg-teal-500/20 transition-colors group-hover:bg-teal-500" />
            {currentSurgery?.otNotes ? (
              <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-slate-600">
                {currentSurgery.otNotes}
              </p>
            ) : (
              <div className="flex h-full flex-col items-center justify-center space-y-4 py-8 text-center text-slate-400">
                <p className="text-xs font-bold">No notes recorded</p>
                <button
                  type="button"
                  onClick={onAddMedia}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-bold text-teal-700 shadow-sm transition-colors hover:bg-teal-50"
                >
                  Add Notes
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
