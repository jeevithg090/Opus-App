import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import PatientDetails from './views/PatientDetails';
import UploadMedia from './views/UploadMedia';
import RecycleBin from './views/RecycleBin';
import AuditTrail from './views/AuditTrail';
import StudyGroupDetailView from './views/StudyGroupDetailView';
import { OpusLogo } from './components/Logo';
import { Patient, StudyGroup, SurgeryEvent, MediaEntry, StorageLocation, AuditEntry, MediaType } from './types';
import { 
  Menu, Library, Plus, X, Fingerprint, Edit3, Trash2, CheckCircle2, KeyRound, UserCircle
} from 'lucide-react';
import { useSupabaseAuth } from './lib/hooks/useSupabaseAuth';
import { supabase } from './lib/supabase';
import { usePatients } from './lib/hooks/usePatients';
import { useMedia } from './lib/hooks/useMedia';
import { useStudyGroups } from './lib/hooks/useStudyGroups';
import { useSurgeries } from './lib/hooks/useSurgeries';
import { useAuditLogs } from './lib/hooks/useAuditLogs';

const App: React.FC = () => {
  const { user: authUser, loading: authLoading, signIn, signUp, signOut } = useSupabaseAuth();
  const { patients, deletedPatients, loading: patientsLoading, addPatient, updatePatient, softDelete, hardDelete, restore, refetch: refetchPatients } = usePatients(authUser?.id ?? null);
  const { media, loading: mediaLoading, addMedia, syncMedia } = useMedia(authUser?.id ?? null);
  const { studyGroups, loading: groupsLoading, createGroup, updateGroup, enrollPatient, unenrollPatient } = useStudyGroups(authUser?.id ?? null);
  const { addSurgery } = useSurgeries();
  const { logs: auditLogs, addEntry } = useAuditLogs(authUser?.id ?? null);

  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [editingStudy, setEditingStudy] = useState<StudyGroup | null>(null);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  
  const [securityContext, setSecurityContext] = useState<{ type: 'soft-delete' | 'hard-delete' | 'restore', patient: Patient } | null>(null);
  const [verificationInput, setVerificationInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Auth screen state
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<'Surgeon' | 'Fellow' | 'Researcher'>('Surgeon');
  const [authError, setAuthError] = useState<string | null>(null);

  const activePatients = patients.filter(p => !p.deletedAt);
  const isLoggedIn = !!authUser;
  const isLoading = authLoading || patientsLoading || mediaLoading || groupsLoading;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { error } = await signIn(authEmail, authPassword);
    if (error) setAuthError(error);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { error } = await signUp(authEmail, authPassword, authName, authRole);
    if (error) {
      setAuthError(error);
    } else {
      setAuthMode('signIn');
      setAuthError('Account created! Check your email to confirm, then sign in.');
    }
  };

  const handleAddPatient = async (p: Patient) => {
    await addPatient(p);
    addEntry(authUser!.id, authUser!.name, 'Patient Creation', p.uhid, `Registered new patient record for ${p.name}.`).catch(() => {});
  };

  const handleUpdatePatient = async (updated: Patient) => {
    await updatePatient(updated);
    if (selectedPatient?.uhid === updated.uhid) setSelectedPatient(updated);
    await addEntry(authUser!.id, authUser!.name, 'Patient Correction', updated.uhid, 'Updated clinical details for patient.');
    setPatientToEdit(null);
  };

  const handleSyncMedia = async (uhid: string, targetLocation: StorageLocation) => {
    await syncMedia(uhid, targetLocation);
    await addEntry(authUser!.id, authUser!.name, 'Vault Sync', uhid, `Synchronized all media assets to ${targetLocation}.`);
  };

  const handleUploadIntake = async (data: any) => {
    const patient = patients.find(p => p.uhid === data.uhid);
    if (!patient) throw new Error('Patient not found. Please register the patient first.');

    let surgeryId = data.surgeryId;

    if (data.surgeryId && data.surgeryId.startsWith('new_') && data.newSurgeryTitle) {
      const newSurgId = `surg_${Date.now()}`;
      await addSurgery(data.uhid, {
        id: newSurgId,
        title: data.newSurgeryTitle,
        date: data.newSurgeryDate || new Date().toISOString().split('T')[0],
        notes: data.notes ?? undefined,
      });
      surgeryId = newSurgId;
      await refetchPatients();
    }

    const files: File[] = data.files ?? [];
    const uploadTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = file.type.startsWith('video/') ? MediaType.VIDEO
        : file.type.startsWith('audio/') ? MediaType.AUDIO
        : file.type === 'application/pdf' ? MediaType.PDF
        : MediaType.IMAGE;

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${authUser!.id}/${data.uhid}/${uploadTime}-${i}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('opus-media')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('opus-media')
        .getPublicUrl(storagePath);

      await addMedia({
        uhid: data.uhid,
        surgeryId: surgeryId || '',
        stage: data.stage,
        type,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
        tags: [],
        storageLocation: data.storageLocation ?? StorageLocation.LOCAL,
        notes: i === 0 ? (data.notes || undefined) : undefined,
      });
    }

    if (files.length === 0 && data.notes) {
      addEntry(authUser!.id, authUser!.name, 'Intake Upload', data.uhid, `Logged clinical notes for ${data.stage} phase (${data.storageLocation ?? StorageLocation.LOCAL}).`).catch(() => {});
      return;
    }

    addEntry(authUser!.id, authUser!.name, 'Intake Upload', data.uhid, `Uploaded ${files.length} session asset${files.length === 1 ? '' : 's'} for ${data.stage} phase (${data.storageLocation ?? StorageLocation.LOCAL}).`).catch(() => {});
  };

  const processSecurityAction = async () => {
    if (!securityContext) return;
    setIsVerifying(true);

    const { type, patient } = securityContext;
    if (type === 'soft-delete') {
      await softDelete(patient.uhid);
      setSelectedPatient(null);
      await addEntry(authUser!.id, authUser!.name, 'Record Archival', patient.uhid, 'Moved patient record to recycle bin.');
    } else if (type === 'hard-delete') {
      await hardDelete(patient.uhid);
      await addEntry(authUser!.id, authUser!.name, 'Permanent Scrub', patient.uhid, 'Permanently purged clinical record from local vault.');
    } else if (type === 'restore') {
      await restore(patient.uhid);
      await addEntry(authUser!.id, authUser!.name, 'Record Restore', patient.uhid, 'Restored patient record from archive.');
    }

    setIsVerifying(false);
    setSecurityContext(null);
    setVerificationInput('');
  };

  const saveStudyGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudy) return;

    if (editingStudy.id === 'temp') {
      const newId = await createGroup(editingStudy.name, editingStudy.description);
      await addEntry(authUser!.id, authUser!.name, 'Group Creation', newId, `Initialized research group: ${editingStudy.name}`);
    } else {
      await updateGroup(editingStudy.id, editingStudy.name, editingStudy.description);
      await addEntry(authUser!.id, authUser!.name, 'Group Update', editingStudy.id, 'Updated research group parameters.');
    }
    setEditingStudy(null);
    setShowStudyModal(false);
  };

  const handleEnrollPatient = async (uhid: string, studyId: string) => {
    await enrollPatient(studyId, uhid);
    await refetchPatients();
    await addEntry(authUser!.id, authUser!.name, 'Group Enrollment', uhid, `Enrolled patient into study group ID: ${studyId}`);
  };

  const handleUnenrollPatient = async (uhid: string, studyId: string) => {
    await unenrollPatient(studyId, uhid);
    await refetchPatients();
    await addEntry(authUser!.id, authUser!.name, 'Group Removal', uhid, `Removed patient from study group ID: ${studyId}`);
  };

  const renderView = () => {
    if (selectedPatient) {
      return (
        <PatientDetails 
          patient={selectedPatient} 
          media={media.filter(m => m.uhid === selectedPatient.uhid)}
          onBack={() => setSelectedPatient(null)} 
          onAddMedia={() => { setActiveView('upload'); setSelectedPatient(null); }}
          onUpdatePatient={handleUpdatePatient}
          onSyncMedia={handleSyncMedia}
          onEditPatient={setPatientToEdit}
          onDeletePatient={(p) => setSecurityContext({ type: 'soft-delete', patient: p })}
          studyGroups={studyGroups}
        />
      );
    }

    if (selectedStudyId) {
      const study = studyGroups.find(s => s.id === selectedStudyId);
      if (!study) return null;
      return (
        <StudyGroupDetailView 
          group={study}
          patients={activePatients}
          onBack={() => setSelectedStudyId(null)}
          onEditPatient={setPatientToEdit}
          onEnroll={(uhid) => handleEnrollPatient(uhid, study.id)}
          onUnenroll={(uhid) => handleUnenrollPatient(uhid, study.id)}
        />
      );
    }

    switch (activeView) {
      case 'dashboard': 
        return <Dashboard patients={activePatients} studyGroups={studyGroups} media={media} onAddPatient={handleAddPatient} onSelectPatient={setSelectedPatient} />;
      case 'upload': 
        return <UploadMedia patients={activePatients} studyGroups={studyGroups} onUpload={handleUploadIntake} onNavigateDashboard={() => setActiveView('dashboard')} />;
      case 'research': 
        return (
          <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-4 md:px-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Research Units</h2>
                <p className="text-slate-400 text-[12px] font-bold uppercase tracking-[0.4em]">Cohort Management</p>
              </div>
              <button onClick={() => { setEditingStudy({id: 'temp', name: '', description: '', patientCount: 0}); setShowStudyModal(true); }} className="w-full sm:w-auto bg-slate-900 text-white px-6 md:px-8 py-3.5 md:py-4 rounded-2xl md:rounded-[1.5rem] text-[12px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Create Cohort
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 pb-32">
              {studyGroups.map(group => (
                <div key={group.id} className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all relative group cursor-pointer" onClick={() => setSelectedStudyId(group.id)}>
                  <div className="absolute top-6 right-6 md:top-8 md:right-8">
                    <button onClick={(e) => { e.stopPropagation(); setEditingStudy(group); setShowStudyModal(true); }} className="p-2.5 md:p-3 bg-slate-50 text-slate-400 rounded-xl md:rounded-2xl hover:text-teal-600 hover:bg-teal-50 transition-all border border-transparent hover:border-teal-100">
                      <Edit3 size={16} />
                    </button>
                  </div>
                  <h3 className="font-black text-slate-900 text-lg md:text-xl mb-3 md:mb-4 pr-12 group-hover:text-teal-700 transition-colors italic uppercase leading-tight">{group.name}</h3>
                  <p className="text-slate-500 text-xs md:text-sm mb-8 md:mb-10 leading-relaxed line-clamp-2 italic">{group.description}</p>
                  <div className="flex justify-between items-center mt-auto">
                    <div className="inline-flex items-center text-[10px] md:text-[11px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-teal-100">
                      <span>{group.patientCount} Records</span>
                    </div>
                    <span className="text-[11px] md:text-[12px] font-black text-slate-300 uppercase tracking-widest group-hover:text-teal-600 transition-colors italic">Enter Unit &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'audit': return <AuditTrail logs={auditLogs} onBack={() => setActiveView('dashboard')} />;
      case 'recycle': return <RecycleBin deletedPatients={deletedPatients} onRestore={(p) => setSecurityContext({ type: 'restore', patient: p })} onPermanentDelete={(p) => setSecurityContext({ type: 'hard-delete', patient: p })} onBack={() => setActiveView('dashboard')} />;
      default: return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600/20 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-50 via-slate-50 to-slate-100">
        <div className="w-full max-w-md text-center">
          <div className="mb-10">
            <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl inline-block mb-8 border border-slate-800">
               <OpusLogo size="md" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[12px]">Secure Clinical Storage</p>
          </div>
          <div className="bg-white/90 backdrop-blur-3xl border border-white rounded-[3rem] p-10 shadow-2xl space-y-6">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              {authMode === 'signIn' ? 'Authentication Required' : 'Register New Account'}
            </p>

            {authError && (
              <div className={`text-xs font-bold px-4 py-2 rounded-xl ${authError.includes('created') ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {authError}
              </div>
            )}

            <form onSubmit={authMode === 'signIn' ? handleSignIn : handleSignUp} className="space-y-4">
              {authMode === 'signUp' && (
                <>
                  <input
                    type="text" placeholder="Full Name" required
                    value={authName} onChange={e => setAuthName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                  />
                  <select
                    value={authRole} onChange={e => setAuthRole(e.target.value as any)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                  >
                    <option value="Surgeon">Surgeon</option>
                    <option value="Fellow">Fellow</option>
                    <option value="Researcher">Researcher</option>
                  </select>
                </>
              )}
              <input
                type="email" placeholder="Email" required
                value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
              />
              <input
                type="password" placeholder="Password" required minLength={6}
                value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
              />
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.8rem] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                {authMode === 'signIn' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <button onClick={() => { setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn'); setAuthError(null); }} className="w-full text-[12px] font-black text-teal-600 uppercase tracking-widest hover:text-teal-700 transition-colors">
              {authMode === 'signIn' ? 'Create an account' : 'Sign in instead'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 selection:bg-teal-100 overflow-x-hidden pb-24 lg:pb-0">
      <Sidebar 
        activeView={activeView} 
        setActiveView={v => { 
          setActiveView(v); 
          setSelectedPatient(null); 
          setSelectedStudyId(null); 
        }} 
        onLogout={() => signOut()} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        deletedCount={deletedPatients.length} 
      />
      <main className={`flex-1 min-h-screen transition-all ${isLoggedIn ? 'lg:ml-64' : ''}`}>
        <header className="px-6 md:px-12 py-5 bg-white/80 border-b border-slate-100 sticky top-0 z-[100] backdrop-blur-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="block lg:hidden"><OpusLogo size="sm" /></div>
             <span className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] hidden lg:inline italic">{activeView} segmented session</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-inner">
               <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-[12px] font-bold">{authUser?.name?.charAt(0) || 'U'}</div>
               <span className="text-[13px] font-black text-slate-700 hidden sm:inline uppercase tracking-widest">{authUser?.name?.split(' ').pop()}</span>
            </div>
          </div>
        </header>
        <div className="px-4 md:px-12 py-6 md:py-12 max-w-7xl mx-auto w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-8 h-8 border-4 border-teal-600/20 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : renderView()}
        </div>
      </main>

      {/* Cohort Modal */}
      {showStudyModal && editingStudy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-[13px] font-black uppercase tracking-[0.5em] text-slate-900 italic leading-none">{editingStudy.id === 'temp' ? 'New' : 'Update'} Unit</h2>
              <button onClick={() => {setEditingStudy(null); setShowStudyModal(false);}} className="text-slate-400 hover:text-slate-900 transition-colors p-2"><X size={24} /></button>
            </div>
            <form onSubmit={saveStudyGroup} className="space-y-8">
              <div className="space-y-2"><label className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-1">Unit Identity</label><input value={editingStudy.name} onChange={e => setEditingStudy({...editingStudy, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-[1.2rem] border border-slate-100 font-black text-sm uppercase tracking-tight focus:ring-8 focus:ring-teal-500/5 transition-all outline-none" required /></div>
              <div className="space-y-2"><label className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-1">Protocol / Notes</label><textarea value={editingStudy.description} onChange={e => setEditingStudy({...editingStudy, description: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-[1.2rem] border border-slate-100 font-bold text-sm h-40 resize-none focus:ring-8 focus:ring-teal-500/5 transition-all outline-none italic" required /></div>
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all">Synchronize Protocol</button>
            </form>
          </div>
        </div>
      )}

      {/* Record Edit Modal */}
      {patientToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 max-h-[90vh] no-scrollbar">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <UserCircle className="text-teal-600" size={28} />
                <h2 className="text-[13px] font-black uppercase tracking-[0.5em] text-slate-900 italic">Vault Correction</h2>
              </div>
              <button onClick={() => setPatientToEdit(null)} className="text-slate-400 hover:text-slate-900 transition-colors p-2"><X size={24} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (patientToEdit) handleUpdatePatient(patientToEdit); }} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest">UHID</label>
                  <input value={patientToEdit.uhid} onChange={e => setPatientToEdit({...patientToEdit, uhid: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-sm font-mono outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Lead Surgeon</label>
                  <input value={patientToEdit.primarySurgeon} onChange={e => setPatientToEdit({...patientToEdit, primarySurgeon: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-sm outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Patient Identity</label>
                 <input value={patientToEdit.name} onChange={e => setPatientToEdit({...patientToEdit, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-sm uppercase tracking-tighter italic outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis</label>
                <textarea 
                  value={patientToEdit.diagnosis} 
                  onChange={e => setPatientToEdit({...patientToEdit, diagnosis: e.target.value})} 
                  className="w-full px-5 py-5 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm h-32 resize-none outline-none italic leading-relaxed"
                />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all">Update Registry</button>
            </form>
          </div>
        </div>
      )}

      {/* Security Checkpoint */}
      {securityContext && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl z-[500] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] p-6 md:p-10 animate-in zoom-in-95 text-center space-y-10">
            <div className="mx-auto w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-teal-600 shadow-inner border border-slate-100">
              {isVerifying ? <div className="w-8 h-8 border-4 border-teal-600/20 border-t-teal-600 rounded-full animate-spin" /> : <KeyRound size={36} className="animate-pulse" />}
            </div>
            <div className="space-y-3">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.5em] italic">Access Denied</h2>
              <p className="text-[12px] text-slate-400 uppercase font-bold tracking-widest leading-relaxed">Identity verification required to modify clinical repository</p>
            </div>
            <input 
              type="password" 
              placeholder="Vault Pin"
              className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-xl font-black outline-none text-center focus:ring-8 focus:ring-teal-500/5 transition-all font-mono tracking-[0.5em]"
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              autoFocus
            />
            <div className="flex gap-4">
              <button onClick={() => setSecurityContext(null)} className="flex-1 text-[12px] font-black uppercase tracking-widest text-slate-400 py-4 hover:text-slate-900 transition-colors">Decline</button>
              <button onClick={processSecurityAction} className="flex-1 bg-slate-900 text-white py-4 rounded-[1.2rem] text-[12px] font-black uppercase tracking-widest shadow-2xl active:scale-95">Authorize</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
