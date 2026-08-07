
import React, { useState, useMemo } from 'react';
import { Camera, Database, CheckCircle2, Trash2, CloudUpload, FileText, Plus, Music, FileUp, Video, Zap, ChevronDown } from 'lucide-react';
import { Patient, SurgicalStage, StudyGroup } from '../types';

interface UploadMediaProps {
  patients: Patient[];
  onUpload: (media: any) => Promise<void> | void;
  studyGroups: StudyGroup[];
  onNavigateDashboard?: () => void;
}

interface PreviewFile {
  url: string;
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
}

const UploadMedia: React.FC<UploadMediaProps> = ({ patients, onUpload, studyGroups, onNavigateDashboard }) => {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [stage, setStage] = useState<SurgicalStage>(SurgicalStage.PRE_OP);
  const [surgeryId, setSurgeryId] = useState('');
  const [newSurgeryTitle, setNewSurgeryTitle] = useState('');
  const [newSurgeryDate, setNewSurgeryDate] = useState('');
  const [otNotes, setOtNotes] = useState('');
  const [showNewSurgeryForm, setShowNewSurgeryForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPatient = useMemo(() => patients.find(p => p.uhid === selectedPatientId), [patients, selectedPatientId]);

  const currentPOD = useMemo(() => {
    if (stage !== SurgicalStage.POST_OP || !selectedPatient) return null;
    let surgeryDateStr = showNewSurgeryForm ? newSurgeryDate : (selectedPatient.surgeries.find(s => s.id === surgeryId)?.date || '');
    if (!surgeryDateStr) return null;
    const surgDate = new Date(surgeryDateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - surgDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  }, [stage, selectedPatient, surgeryId, showNewSurgeryForm, newSurgeryDate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, specificType?: 'pdf') => {
    if (e.target.files) {
      const files: File[] = Array.from(e.target.files);
      const processedFiles = files.map((file): PreviewFile => {
        let type: 'image' | 'video' | 'audio' | 'pdf' = 'image';
        if (file.type === 'application/pdf' || specificType === 'pdf') type = 'pdf';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        return { url: URL.createObjectURL(file), file, type };
      });
      setPreviewFiles(prev => [...prev, ...processedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setPreviewFiles(prev => {
      const fileToRemove = prev[index];
      if (fileToRemove.url) URL.revokeObjectURL(fileToRemove.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please select a patient from the registry first.');
      return;
    }
    if (previewFiles.length === 0 && !otNotes) {
      setError('Please attach at least one asset or enter clinical notes.');
      return;
    }

    const selectedPatient = patients.find(p => p.uhid === selectedPatientId);
    if (!selectedPatient) {
      setError('Selected patient not found. Please refresh and try again.');
      return;
    }

    const hasSurgeries = selectedPatient.surgeries && selectedPatient.surgeries.length > 0;
    if (!showNewSurgeryForm && !hasSurgeries) {
      setError('This patient has no procedures. Please create one using "+ New Procedure".');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      await onUpload({
        uhid: selectedPatientId,
        stage,
        timestamp: new Date().toISOString(),
        surgeryId: surgeryId || (showNewSurgeryForm ? `new_${Date.now()}` : ''),
        notes: otNotes,
        newSurgeryTitle,
        newSurgeryDate,
      });
      setShowSuccess(true);
      setPreviewFiles([]);
      setOtNotes('');
    } catch (err: any) {
      setError(err?.message || 'Failed to commit session. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center space-y-8 animate-in zoom-in-95 px-4 h-[80vh] flex flex-col justify-center">
        <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center mx-auto border border-teal-100 shadow-sm animate-bounce">
          <CheckCircle2 size={40} />
        </div>
        <div className="space-y-2 px-4">
          <h2 className="text-2xl font-bold text-slate-900">Sync Complete</h2>
          <p className="text-slate-500 text-sm">Session committed to clinical vault.</p>
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
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-48 px-4 md:px-0 animate-in fade-in duration-700">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Intake</h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">Initialize a new clinical recording session.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Step 1: Context Selection */}
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
            <Database size={14} md:size={16} className="text-teal-500" />
            Registry Association
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 ml-1">Target Identity *</label>
              <div className="relative group">
                <select 
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 text-sm outline-none appearance-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all" 
                  value={selectedPatientId} 
                  onChange={e => setSelectedPatientId(e.target.value)} 
                  required
                >
                  <option value="">Query Registry...</option>
                  {patients.map(p => <option key={p.uhid} value={p.uhid}>{p.name} ({p.uhid})</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>

            {selectedPatient && (
              <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-medium text-slate-500">Procedure</label>
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
                        onChange={e => setSurgeryId(e.target.value)} 
                        required
                      >
                        <option value="">Select Target...</option>
                        {selectedPatient.surgeries.map(s => <option key={s.id} value={s.id}>{s.title} ({s.date})</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  ) : (
                    <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                      <input 
                        required 
                        placeholder="New Procedure Title" 
                        className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-teal-500 transition-all text-sm font-medium" 
                        value={newSurgeryTitle} 
                        onChange={e => setNewSurgeryTitle(e.target.value)} 
                      />
                      <input 
                        required 
                        type="date" 
                        className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-teal-500 transition-all text-sm font-medium" 
                        value={newSurgeryDate} 
                        onChange={e => setNewSurgeryDate(e.target.value)} 
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-medium text-slate-500">Surgical Phase</label>
                    {currentPOD !== null && (
                      <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                        POD {currentPOD}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.values(SurgicalStage).map(s => (
                      <button 
                        key={s} 
                        type="button" 
                        onClick={() => setStage(s)} 
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
            <Camera size={16} className="text-teal-500" />
            Clinical Assets
          </div>

          <div className="space-y-6">
            <div className="relative p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center cursor-pointer min-h-[160px] hover:bg-white hover:border-teal-300 transition-all group active:scale-[0.98]">
              <input type="file" multiple accept="image/*,video/*,audio/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
              <CloudUpload size={32} className="text-slate-300 mb-3 group-hover:text-teal-500 transition-colors" />
              <p className="text-sm font-bold text-slate-900">Extract Assets</p>
              <p className="text-xs text-slate-400 mt-1">Multimedia / DICOM</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 ml-1">Clinical Log</label>
              <textarea 
                value={otNotes} 
                onChange={e => setOtNotes(e.target.value)} 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl h-32 text-sm font-medium outline-none text-slate-700 leading-relaxed focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all resize-none" 
                placeholder="Synchronize findings..." 
              />
            </div>

            {/* Asset Preview Queue */}
            {previewFiles.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Queue — {previewFiles.length} Assets</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {previewFiles.map((file, i) => (
                    <div key={i} className="aspect-square bg-slate-50 rounded-xl overflow-hidden relative border border-slate-200 shadow-sm group animate-in zoom-in-95">
                      {file.type === 'image' && <img src={file.url} className="w-full h-full object-cover" />}
                      {file.type !== 'image' && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                          <FileText size={16} />
                          <span className="text-[8px] font-bold uppercase">{file.type}</span>
                        </div>
                      )}
                      <button 
                        type="button" 
                        onClick={() => removeFile(i)} 
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isUploading || !selectedPatientId} 
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Integrating...' : 'Commit Session'}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-bold text-red-600 text-center">
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
