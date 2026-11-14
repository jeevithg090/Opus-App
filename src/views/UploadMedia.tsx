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
      <div
        role="status"
        className="max-w-lg mx-auto py-24 text-center space-y-8 px-4 min-h-[60vh] flex flex-col justify-center"
      >
        <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center mx-auto border border-teal-100 shadow-sm animate-bounce">
          <CheckCircle2 size={40} aria-hidden="true" />
        </div>
        <div className="space-y-2 px-4">
          <h2 className="text-2xl font-bold text-slate-900">Session saved</h2>
          <p className="text-slate-500 text-sm">Files and notes were added to the patient record.</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => setShowSuccess(false)}
            className="w-full bg-slate-900 text-white font-medium py-4 rounded-xl text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
          >
            New Intake Session
          </button>
          <button
            onClick={() => onNavigateDashboard?.()}
            className="w-full bg-white border border-slate-200 text-slate-600 font-medium py-4 rounded-xl text-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-32 lg:pb-12 duration-700">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Intake</h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">Record media and notes for a patient's procedure.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Step 1: Context Selection */}
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-[12px] md:text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
            <Database size={16} className="text-teal-500" aria-hidden="true" />
            Registry Association
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="intake-patient" className="text-xs font-medium text-slate-600 ml-1">
                Patient *
              </label>
              <div className="relative group">
                <select
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 text-sm outline-none appearance-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>

            {selectedPatient && (
              <div className="space-y-6 duration-300">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-medium text-slate-600">Procedure</span>
                    <button
                      type="button"
                      onClick={() => setShowNewSurgeryForm(!showNewSurgeryForm)}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      {showNewSurgeryForm ? 'Back' : '+ New Procedure'}
                    </button>
                  </div>
                  {!showNewSurgeryForm ? (
                    <div className="relative group">
                      <select
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 text-sm outline-none appearance-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
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
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        size={16}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                      <input
                        required
                        placeholder="New procedure title"
                        aria-label="New procedure title"
                        className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-teal-500 transition-all text-sm font-medium"
                        value={newSurgeryTitle}
                        onChange={(e) => setNewSurgeryTitle(e.target.value)}
                      />
                      <input
                        required
                        type="date"
                        aria-label="Procedure date"
                        max={todayIsoDate()}
                        className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-teal-500 transition-all text-sm font-medium"
                        value={newSurgeryDate}
                        onChange={(e) => setNewSurgeryDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-medium text-slate-600">Surgical Phase</span>
                    {currentPOD !== null && (
                      <span className="text-[12px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                        POD {currentPOD}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.values(SurgicalStage).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStage(s)}
                        aria-pressed={stage === s}
                        className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all flex justify-between items-center ${stage === s ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm' : 'border-slate-100 text-slate-400 bg-slate-50/50 hover:border-slate-200'}`}
                      >
                        {s}
                        {stage === s && <CheckCircle2 size={14} className="text-teal-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Session Data Intake */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
            <Camera size={16} className="text-teal-500" aria-hidden="true" />
            Clinical Assets
          </div>

          <div className="space-y-6">
            <div className="relative p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center cursor-pointer min-h-[160px] hover:bg-white hover:border-teal-300 transition-all group active:scale-[0.98]">
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*,application/pdf"
                aria-label="Add files"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={handleFileChange}
              />
              <CloudUpload
                size={32}
                className="text-slate-300 mb-3 group-hover:text-teal-500 transition-colors"
                aria-hidden="true"
              />
              <p className="text-sm font-bold text-slate-900">Add files</p>
              <p className="text-xs text-slate-500 mt-1">Images, video, audio or PDF · up to 50 MB each</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="intake-notes" className="text-xs font-medium text-slate-600 ml-1">
                Clinical notes
              </label>
              <textarea
                id="intake-notes"
                value={otNotes}
                onChange={(e) => setOtNotes(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl h-32 text-sm font-medium outline-none text-slate-700 leading-relaxed focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all resize-none"
                placeholder="Operative findings, observations…"
              />
            </div>

            {/* Asset Preview Queue */}
            {previewFiles.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Queue — {previewFiles.length} Assets
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {previewFiles.map((file) => (
                    <div
                      key={file.id}
                      className="aspect-square bg-slate-50 rounded-xl overflow-hidden relative border border-slate-200 shadow-sm group"
                    >
                      {file.type === MediaType.IMAGE && (
                        <img src={file.url} alt={file.file.name} className="w-full h-full object-cover" />
                      )}
                      {file.type !== MediaType.IMAGE && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                          <FileText size={16} />
                          <span className="text-[10px] font-bold uppercase">{file.type}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        aria-label={`Remove ${file.file.name}`}
                        className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-md shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <span className="text-xs font-medium text-slate-600 ml-1">Storage tag</span>
              <div className="grid grid-cols-2 gap-2">
                {[StorageLocation.LOCAL, StorageLocation.GOOGLE_DRIVE].map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setStorageLocation(loc)}
                    aria-pressed={storageLocation === loc}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${storageLocation === loc ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm' : 'border-slate-100 text-slate-400 bg-slate-50/50 hover:border-slate-200'}`}
                  >
                    {loc === StorageLocation.LOCAL ? <HardDrive size={14} /> : <Cloud size={14} />}
                    {loc === StorageLocation.LOCAL ? 'Local Vault' : 'Google Drive'}
                    {storageLocation === loc && <CheckCircle2 size={14} className="text-teal-600" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading || !selectedPatientId}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Saving…' : 'Save Session'}
            </button>

            {error && (
              <div
                role="alert"
                className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-bold text-red-600 text-center"
              >
                {error}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default UploadMedia;
