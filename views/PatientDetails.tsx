
import React, { useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Download, X, Edit, HardDrive, PlayCircle, Trash2, 
  FileText, Plus, Volume2, Shield, Cloud, RefreshCw, CheckCircle, Zap,
  Maximize2, PauseCircle, Music
} from 'lucide-react';
import { Patient, SurgicalStage, MediaType, MediaEntry, StorageLocation } from '../types';

interface PatientDetailsProps {
  patient: Patient;
  media: MediaEntry[];
  onBack: () => void;
  onAddMedia: () => void;
  onUpdatePatient: (updatedPatient: Patient) => void;
  onSyncMedia: (uhid: string, target: StorageLocation) => Promise<void>;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patient: Patient) => void;
  studyGroups: any[];
}

const MediaItem: React.FC<{ 
  m: MediaEntry, 
  onDownload: (m: MediaEntry) => void,
  onOpen: (m: MediaEntry) => void,
  playingAudioId: string | null,
  setPlayingAudioId: (id: string | null) => void 
}> = ({ m, onDownload, onOpen, playingAudioId, setPlayingAudioId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const isPlayingAudio = playingAudioId === m.id;

  return (
    <div 
      className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm flex items-center justify-center transition-all hover:shadow-md active:scale-[0.98] cursor-pointer"
      onClick={() => onOpen(m)}
    >
      {m.type === MediaType.VIDEO ? (
        <div className="w-full h-full relative group">
          <video 
            ref={videoRef}
            src={m.url} 
            muted 
            loop 
            playsInline
            className="w-full h-full object-cover transition-all duration-500"
            poster={m.thumbnailUrl}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-full text-slate-900 shadow-lg group-hover:scale-110 transition-transform">
              <PlayCircle size={24} />
            </div>
          </div>
        </div>
      ) : m.type === MediaType.AUDIO ? (
        <div 
          className="flex flex-col items-center justify-center p-6 w-full h-full text-center space-y-3"
          onClick={(e) => { e.stopPropagation(); setPlayingAudioId(isPlayingAudio ? null : m.id); }}
        >
          <div className={`p-4 rounded-full border transition-all duration-300 ${isPlayingAudio ? 'bg-teal-600 text-white border-teal-500 scale-105 shadow-md' : 'bg-white text-teal-600 border-teal-100 shadow-sm'}`}>
            {isPlayingAudio ? <PauseCircle size={24} /> : <Music size={24} />}
          </div>
          
          <div className="space-y-1 w-full">
            <p className="text-[10px] font-semibold text-slate-900 truncate">{m.notes || 'Voice Memo'}</p>
            <div className="flex items-center justify-center gap-0.5 h-3">
              {[1, 2, 3, 4, 5, 6, 4, 2, 3, 5, 3, 2].map((h, i) => (
                <div 
                  key={i} 
                  className={`w-0.5 rounded-full transition-all duration-300 ${isPlayingAudio ? 'bg-teal-400 animate-pulse' : 'bg-slate-200'}`}
                  style={{ height: isPlayingAudio ? `${h * 3}px` : '3px' }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full relative group">
          <img src={m.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Clinical asset" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" />
          </div>
        </div>
      )}
      
      {/* Media Type/Location Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm pointer-events-none">
        {m.storageLocation === StorageLocation.GOOGLE_DRIVE ? (
          <Cloud size={10} className="text-teal-600" />
        ) : (
          <HardDrive size={10} className="text-slate-400" />
        )}
        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">
          {m.type}
        </span>
      </div>

      {/* Quick Action Button */}
      <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
        <button 
          onClick={(e) => { e.stopPropagation(); onDownload(m); }} 
          className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-slate-700 hover:bg-slate-900 hover:text-white transition-all shadow-md border border-slate-200"
        >
          <Download size={14} />
        </button>
      </div>
    </div>
  );
};

const PatientDetails: React.FC<PatientDetailsProps> = ({ 
  patient, media, onBack, onAddMedia, onUpdatePatient, onSyncMedia, onEditPatient, onDeletePatient 
}) => {
  const [activeSurgeryId, setActiveSurgeryId] = useState<string>(patient.surgeries[0]?.id || '');
  const [activeStage, setActiveStage] = useState<SurgicalStage>(SurgicalStage.PRE_OP);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [downloadModalMedia, setDownloadModalMedia] = useState<MediaEntry | null>(null);
  const [viewerMedia, setViewerMedia] = useState<MediaEntry | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<string>('JPG');
  const [isSyncing, setIsSyncing] = useState(false);

  const currentSurgery = patient.surgeries.find(s => s.id === activeSurgeryId);
  const filteredMedia = media.filter(m => m.surgeryId === activeSurgeryId && m.stage === activeStage);

  const syncStats = useMemo(() => {
    const total = media.length;
    const cloud = media.filter(m => m.storageLocation === StorageLocation.GOOGLE_DRIVE).length;
    const local = total - cloud;
    return { total, cloud, local };
  }, [media]);

  const triggerGlobalSync = async () => {
    setIsSyncing(true);
    const target = syncStats.local > 0 ? StorageLocation.GOOGLE_DRIVE : StorageLocation.LOCAL;
    await onSyncMedia(patient.uhid, target);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-32 lg:pb-12 px-4 md:px-0">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex justify-between items-center">
          <button onClick={onBack} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm text-slate-500 hover:text-teal-600 hover:border-teal-100 active:scale-95 transition-all group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <button onClick={onAddMedia} className="bg-teal-600 hover:bg-teal-700 text-white px-4 md:px-6 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 font-medium text-sm">
            <Plus size={18} /> 
            <span className="hidden sm:inline">New Session</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Profile Bento */}
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-5 md:gap-8 items-start md:items-center">
          <div className="flex items-center gap-4 md:gap-5 w-full">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 text-teal-600 rounded-2xl flex items-center justify-center font-bold text-xl md:text-2xl shadow-sm shrink-0 border border-teal-50">{patient.name.charAt(0)}</div>
            <div className="space-y-1 min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight truncate">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="text-[10px] md:text-xs font-mono font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{patient.uhid}</span>
                <span className="text-[10px] md:text-xs font-medium text-slate-500">{patient.gender} • {patient.ageYears}Y</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed text-xs md:text-sm italic">
            {patient.diagnosis}
          </div>
          <div className="flex gap-2 w-full md:w-auto shrink-0">
            <button onClick={() => onEditPatient(patient)} className="flex-1 md:flex-none p-3 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-100 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-all flex justify-center"><Edit size={18} /></button>
            <button onClick={() => onDeletePatient(patient)} className="flex-1 md:flex-none p-3 bg-white text-slate-400 hover:text-red-500 hover:border-red-100 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-all flex justify-center"><Trash2 size={18} /></button>
          </div>
        </div>
      </div>

      {/* Sync Control */}
      <div className="bg-slate-900 p-5 md:p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-5 md:gap-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className={`p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 ${isSyncing ? 'animate-pulse' : ''}`}>
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </div>
          <div className="space-y-1">
            <p className="text-white text-[10px] md:text-xs font-bold uppercase tracking-wider">Cloud Synchronization</p>
            <div className="flex gap-3 md:gap-4">
              <span className="text-[9px] md:text-[10px] text-teal-500 font-bold flex items-center gap-1.5"><Cloud size={10} /> {syncStats.cloud} Synced</span>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-bold flex items-center gap-1.5"><HardDrive size={10} /> {syncStats.local} Local</span>
            </div>
          </div>
        </div>
        <button 
          onClick={triggerGlobalSync}
          disabled={isSyncing || syncStats.local === 0}
          className={`w-full sm:w-auto px-6 md:px-8 py-3 rounded-xl text-[11px] md:text-xs font-bold transition-all active:scale-95 ${syncStats.local === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-500 shadow-lg shadow-teal-900/20'}`}
        >
          {isSyncing ? 'Syncing...' : syncStats.local === 0 ? 'Vault Secure' : 'Sync to Cloud'}
        </button>
      </div>

      {/* Surgery Switcher */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 ml-1">
          <Zap size={14} className="text-teal-500" /> Procedure History
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {patient.surgeries.map(s => (
            <button 
              key={s.id} onClick={() => setActiveSurgeryId(s.id)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${activeSurgeryId === s.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Gallery Segment */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex bg-slate-50 p-1.5 border-b border-slate-200 gap-1">
            {Object.values(SurgicalStage).map(stage => (
              <button 
                key={stage} 
                onClick={() => setActiveStage(stage)} 
                className={`flex-1 py-2.5 text-[11px] font-bold transition-all rounded-xl ${activeStage === stage ? 'text-teal-700 bg-white shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {stage}
              </button>
            ))}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredMedia.map(m => (
                <MediaItem 
                  key={m.id} 
                  m={m} 
                  onDownload={(m) => { setDownloadModalMedia(m); setDownloadFormat('JPG'); }} 
                  onOpen={(m) => setViewerMedia(m)}
                  playingAudioId={playingAudioId} 
                  setPlayingAudioId={setPlayingAudioId} 
                />
              ))}
              {filteredMedia.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 border border-slate-100">
                    <FileText size={28} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold text-xs">No assets in this stage</p>
                    <p className="text-slate-300 text-[10px]">Upload new media to populate this segment</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Findings Sidebar */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl border border-teal-100"><Shield size={20} /></div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">Clinical Findings</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-1">Surgical Protocol Verified</p>
            </div>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 min-h-[200px] relative group overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-teal-500/20 group-hover:bg-teal-500 transition-colors" />
             {currentSurgery?.otNotes ? (
               <p className="text-sm text-slate-600 leading-relaxed italic whitespace-pre-wrap">{currentSurgery.otNotes}</p>
             ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-300 py-8 text-center space-y-4">
                  <p className="text-xs font-bold">No notes recorded</p>
                  <button onClick={onAddMedia} className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-[10px] font-bold text-teal-600 hover:bg-teal-50 transition-colors shadow-sm">Add Notes</button>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Media Viewer Modal */}
      {viewerMedia && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[600] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <button onClick={() => setViewerMedia(null)} className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 md:p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all z-10">
            <X size={20} md:size={24} />
          </button>
          
          <div className="w-full h-full p-4 md:p-6 flex flex-col items-center justify-center relative">
            {viewerMedia.type === MediaType.VIDEO ? (
              <video 
                src={viewerMedia.url} 
                controls 
                autoPlay 
                className="max-w-full max-h-[70vh] md:max-h-[75vh] rounded-2xl shadow-2xl border border-white/10" 
              />
            ) : viewerMedia.type === MediaType.AUDIO ? (
               <div className="bg-white p-8 md:p-12 rounded-3xl text-center space-y-6 md:space-y-8 w-full max-w-sm md:max-w-md shadow-2xl">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto border border-teal-100">
                    <Music size={32} md:size={40} className="animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg md:text-xl font-bold text-slate-900">Clinical Audio</h2>
                    <p className="text-[10px] md:text-xs font-medium text-slate-400">{viewerMedia.notes || 'Anatomical Assessment Log'}</p>
                  </div>
                  <audio src={viewerMedia.url} controls className="w-full" />
               </div>
            ) : (
              <img src={viewerMedia.url} className="max-w-full max-h-[75vh] md:max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10" alt="Full view" />
            )}

            <div className="mt-6 md:mt-8 flex items-center gap-4 md:gap-6 px-6 md:px-8 py-3 md:py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <div className="text-left">
                <p className="text-white text-xs md:text-sm font-bold">{viewerMedia.stage}</p>
                <p className="text-slate-400 text-[9px] md:text-[10px] font-medium mt-1">{new Date(viewerMedia.uploadedAt).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={() => { setDownloadModalMedia(viewerMedia); setViewerMedia(null); }} 
                className="p-2.5 md:p-3 bg-white text-slate-900 rounded-xl hover:bg-teal-500 hover:text-white transition-all shadow-lg"
              >
                <Download size={18} md:size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Asset Modal */}
      {downloadModalMedia && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[700] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 md:p-8 animate-in slide-in-from-bottom-10 sm:zoom-in-95 text-center space-y-6 md:space-y-8">
            <div className="mx-auto w-14 h-14 md:w-16 md:h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center border border-teal-100"><Download size={28} md:size={32} /></div>
            <div className="space-y-2">
              <h2 className="text-lg md:text-xl font-bold text-slate-900">Export Asset</h2>
              <p className="text-[10px] md:text-xs text-slate-400 font-medium leading-relaxed">Select format for archival extraction</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['JPG', 'PNG', 'PDF', 'RAW'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setDownloadFormat(f)} 
                  className={`py-3 rounded-xl text-xs font-bold transition-all ${downloadFormat === f ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDownloadModalMedia(null)} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">Cancel</button>
              <button onClick={() => setDownloadModalMedia(null)} className="flex-1 bg-teal-600 text-white py-3 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all">Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails;
