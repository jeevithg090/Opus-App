import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Database,
  CheckCircle2,
  Trash2,
  CloudUpload,
  FileText,
  ChevronDown,
  HardDrive,
  Cloud,
} from 'lucide-react';
import { MediaType, SurgicalStage, StorageLocation } from '../types';
import type { Patient } from '../types';
import type { IntakeInput } from '../lib/intake';
import { errorMessage, mediaTypeFromFile, postOpDay, todayIsoDate } from '../lib/clinical';

/** Matches the `opus-media` bucket's per-object limit. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

interface UploadMediaProps {
  patients: Patient[];
  onUpload: (input: IntakeInput) => Promise<void>;
  onNavigateDashboard?: () => void;
}

interface PreviewFile {
  id: string;
  url: string;
  file: File;
  type: MediaType;
}

const UploadMedia: React.FC<UploadMediaProps> = ({ patients, onUpload, onNavigateDashboard }) => {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [stage, setStage] = useState<SurgicalStage>(SurgicalStage.PRE_OP);
  const [surgeryId, setSurgeryId] = useState('');
  const [newSurgeryTitle, setNewSurgeryTitle] = useState('');
  const [newSurgeryDate, setNewSurgeryDate] = useState('');
  const [otNotes, setOtNotes] = useState('');
  const [showNewSurgeryForm, setShowNewSurgeryForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [storageLocation, setStorageLocation] = useState<StorageLocation>(StorageLocation.LOCAL);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.uhid === selectedPatientId),
    [patients, selectedPatientId],
  );

  // Revoke object URLs for any previews still queued when the view unmounts.
  const previewsRef = useRef<PreviewFile[]>([]);
  useEffect(() => {
    previewsRef.current = previewFiles;
  }, [previewFiles]);
  useEffect(() => () => previewsRef.current.forEach((pf) => URL.revokeObjectURL(pf.url)), []);

  const currentPOD = useMemo(() => {
    if (stage !== SurgicalStage.POST_OP || !selectedPatient) return null;
    const surgeryDate = showNewSurgeryForm
      ? newSurgeryDate
      : selectedPatient.surgeries.find((s) => s.id === surgeryId)?.date;
    return postOpDay(surgeryDate);
  }, [stage, selectedPatient, surgeryId, showNewSurgeryForm, newSurgeryDate]);

  const selectPatient = (uhid: string) => {
    setSelectedPatientId(uhid);
    setSurgeryId('');
    const patient = patients.find((p) => p.uhid === uhid);
    setShowNewSurgeryForm(Boolean(patient && patient.surgeries.length === 0));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files ?? []);
    e.target.value = '';
    const tooLarge = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooLarge.length > 0) {
      setError(
        `${tooLarge.map((f) => f.name).join(', ')} exceed${tooLarge.length === 1 ? 's' : ''} the 50 MB limit and ${tooLarge.length === 1 ? 'was' : 'were'} skipped.`,
      );
    }
    const accepted = files
      .filter((f) => f.size <= MAX_FILE_BYTES)
      .map((file, i): PreviewFile => ({
        id: `${Date.now()}-${i}-${file.name}`,
        url: URL.createObjectURL(file),
        file,
        type: mediaTypeFromFile(file),
      }));
    setPreviewFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (id: string) => {
    setPreviewFiles((prev) => {
      const target = prev.find((pf) => pf.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((pf) => pf.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please select a patient from the registry first.');
      return;
    }
    if (previewFiles.length === 0 && !otNotes.trim()) {
      setError('Please attach at least one asset or enter clinical notes.');
      return;
    }

    const selectedPatient = patients.find((p) => p.uhid === selectedPatientId);
    if (!selectedPatient) {
      setError('Selected patient not found. Please refresh and try again.');
      return;
    }

    if (!showNewSurgeryForm && selectedPatient.surgeries.length === 0) {
      setError('This patient has no procedures. Please create one using "+ New Procedure".');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      await onUpload({
        uhid: selectedPatientId,
        stage,
        surgeryId: showNewSurgeryForm ? undefined : surgeryId,
        newSurgery: showNewSurgeryForm ? { title: newSurgeryTitle, date: newSurgeryDate } : undefined,
        notes: otNotes,
        files: previewFiles.map((pf) => pf.file),
        storageLocation,
      });
      previewFiles.forEach((pf) => URL.revokeObjectURL(pf.url));
      setPreviewFiles([]);
      setOtNotes('');
      setNewSurgeryTitle('');
      setNewSurgeryDate('');
      setShowNewSurgeryForm(false);
      setSurgeryId('');
      setShowSuccess(true);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save the session. Please try again.'));
    } finally {
      setIsUploading(false);
    }
  };

  if (showSuccess) {
    return (
      <div role="status" className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 animate-rise-in items-center justify-center rounded-2xl border border-brand-line bg-brand-soft text-brand-ink">
          <CheckCircle2 size={32} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-ink">Session saved</h1>
        <p className="mt-2 text-sm text-ink-3">Files and notes were added to the patient record.</p>
        <div className="mt-8 flex flex-col gap-2">
          <button type="button" onClick={() => setShowSuccess(false)} className="btn-primary w-full">
            New Intake Session
          </button>
          <button type="button" onClick={() => onNavigateDashboard?.()} className="btn-secondary w-full">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const selectClass = 'field appearance-none pr-10';
  const choiceClass = (selected: boolean) =>
    `flex min-h-11 items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${selected ? 'border-brand-accent bg-brand-soft text-brand-ink' : 'border-line bg-surface-2 text-ink-2 hover:border-line-strong hover:text-ink'}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-32 lg:pb-12">
      <div>
        <h1 className="page-title">Intake</h1>
        <p className="page-subtitle">Record media and notes for a patient&apos;s procedure.</p>
      </div>

      {patients.length === 0 && (
        <div className="alert-success flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Register a patient first, then come back to record their media.</span>
          {onNavigateDashboard && (
            <button type="button" onClick={onNavigateDashboard} className="btn-secondary min-h-9 px-3 py-1.5 text-xs">
              Go to registry
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Step 1: Context selection */}
        <fieldset className="card space-y-5 p-5 md:p-6">
          <legend className="sr-only">Registry association</legend>
          <div className="eyebrow" aria-hidden="true">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
              1
            </span>
            <Database size={14} /> Registry association
          </div>

          <div>
            <label htmlFor="intake-patient" className="field-label">
              Patient
              <span className="ml-0.5 text-danger-ink" aria-hidden="true">
                *
              </span>
            </label>
            <div className="relative">
              <select
                className={selectClass}
                value={selectedPatientId}
                onChange={(e) => selectPatient(e.target.value)}
                id="intake-patient"
                required
              >
                <option value="">Select a patient…</option>
                {patients.map((p) => (
                  <option key={p.uhid} value={p.uhid}>
                    {p.name} ({p.uhid})
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-3"
                size={16}
                aria-hidden="true"
              />
            </div>
          </div>

          {selectedPatient && (
            <div className="animate-fade-in space-y-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-2" id="procedure-label">
                    Procedure
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewSurgeryForm(!showNewSurgeryForm)}
                    className="-my-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-ink hover:bg-brand-soft"
                  >
                    {showNewSurgeryForm ? 'Choose existing' : '+ New Procedure'}
                  </button>
                </div>
                {!showNewSurgeryForm ? (
                  <div className="relative">
                    <select
                      className={selectClass}
                      value={surgeryId}
                      onChange={(e) => setSurgeryId(e.target.value)}
                      aria-label="Procedure"
                      required
                    >
                      <option value="">Select a procedure…</option>
                      {selectedPatient.surgeries.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.date})
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-3"
                      size={16}
                      aria-hidden="true"
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 rounded-xl border border-line bg-surface-2 p-4 sm:grid-cols-2">
                    <input
                      required
                      placeholder="New procedure title"
                      aria-label="New procedure title"
                      className="field bg-surface"
                      value={newSurgeryTitle}
                      onChange={(e) => setNewSurgeryTitle(e.target.value)}
                    />
                    <input
                      required
                      type="date"
                      aria-label="Procedure date"
                      max={todayIsoDate()}
                      className="field bg-surface"
                      value={newSurgeryDate}
                      onChange={(e) => setNewSurgeryDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div role="group" aria-labelledby="phase-label">
                <div className="mb-1.5 flex items-center justify-between">
                  <span id="phase-label" className="text-xs font-semibold text-ink-2">
                    Surgical phase
                  </span>
                  {currentPOD !== null && <span className="badge-brand">POD {currentPOD}</span>}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {Object.values(SurgicalStage).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStage(s)}
                      aria-pressed={stage === s}
                      className={choiceClass(stage === s)}
                    >
                      {s}
                      {stage === s && <CheckCircle2 size={16} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {/* Step 2: Session data */}
        <fieldset className="card space-y-5 p-5 md:p-6">
          <legend className="sr-only">Clinical assets</legend>
          <div className="eyebrow" aria-hidden="true">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
              2
            </span>
            <Camera size={14} /> Clinical assets
          </div>

          <div
            className={`group relative flex min-h-[150px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors focus-within:border-brand-accent ${isDragging ? 'border-brand-accent bg-brand-soft' : 'border-line bg-surface-2 hover:border-brand-line hover:bg-brand-soft/50'}`}
          >
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*,application/pdf"
              aria-label="Add files"
              aria-describedby="file-hint"
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              onChange={(e) => {
                setIsDragging(false);
                handleFileChange(e);
              }}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
            />
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-ink shadow-card">
              <CloudUpload size={24} aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-ink">
              <span className="text-brand-ink">Choose files</span> or drag them here
            </p>
            <p id="file-hint" className="mt-1 text-xs text-ink-3">
              Images, video, audio or PDF · up to 50 MB each
            </p>
          </div>

          {/* Asset preview queue */}
          {previewFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-2" aria-live="polite">
                {previewFiles.length} file{previewFiles.length === 1 ? '' : 's'} ready to upload
              </p>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {previewFiles.map((file) => (
                  <li
                    key={file.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2 shadow-card"
                  >
                    {file.type === MediaType.IMAGE ? (
                      <img src={file.url} alt={file.file.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-ink-3">
                        <FileText size={18} aria-hidden="true" />
                        <span className="text-[10px] font-bold uppercase">{file.type}</span>
                        <span className="w-full truncate text-center text-[10px]">{file.file.name}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      aria-label={`Remove ${file.file.name}`}
                      className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg bg-danger text-white shadow-card transition-opacity focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label htmlFor="intake-notes" className="field-label">
              Clinical notes
            </label>
            <textarea
              id="intake-notes"
              value={otNotes}
              onChange={(e) => setOtNotes(e.target.value)}
              className="field h-32 resize-none leading-relaxed"
              placeholder="Operative findings, observations…"
              aria-describedby="notes-hint"
            />
            <p id="notes-hint" className="field-hint">
              Appended to the procedure&apos;s operative notes with the phase and date.
            </p>
          </div>

          <div role="group" aria-labelledby="storage-label">
            <span id="storage-label" className="field-label">
              Storage tag
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[StorageLocation.LOCAL, StorageLocation.GOOGLE_DRIVE].map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setStorageLocation(loc)}
                  aria-pressed={storageLocation === loc}
                  className={choiceClass(storageLocation === loc)}
                >
                  <span className="flex items-center gap-2">
                    {loc === StorageLocation.LOCAL ? (
                      <HardDrive size={16} aria-hidden="true" />
                    ) : (
                      <Cloud size={16} aria-hidden="true" />
                    )}
                    {loc === StorageLocation.LOCAL ? 'Local Vault' : 'Google Drive'}
                  </span>
                  {storageLocation === loc && <CheckCircle2 size={16} aria-hidden="true" />}
                </button>
              ))}
            </div>
            <p className="field-hint">A label for where copies are archived. Files are always stored in OPUS.</p>
          </div>

          {error && (
            <div role="alert" className="alert-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={isUploading || !selectedPatientId} className="btn-primary w-full">
            {isUploading ? 'Saving…' : 'Save Session'}
          </button>
          {!selectedPatientId && patients.length > 0 && (
            <p className="-mt-3 text-center text-xs text-ink-3">Select a patient to enable saving.</p>
          )}
        </fieldset>
      </form>
    </div>
  );
};

export default UploadMedia;
