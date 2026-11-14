import React, { Suspense, lazy, useCallback, useState } from 'react';
import { LogOut } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { VIEW_TITLES, type ViewId } from './components/navigation';
import { OpusLogo } from './components/Logo';
import Spinner from './components/Spinner';
import Notice, { type NoticeState } from './components/Notice';
import StudyGroupModal from './components/StudyGroupModal';
import PatientEditModal from './components/PatientEditModal';
import ConfirmActionModal, { type RecordAction } from './components/ConfirmActionModal';
import AuthScreen from './views/AuthScreen';
import SetupScreen from './views/SetupScreen';
import { isConfigured } from './lib/env';
import { errorMessage } from './lib/clinical';
import { submitIntake, type IntakeInput } from './lib/intake';
import { addSurgery, appendSurgeryNotes } from './lib/surgeries';
import { removeMediaFiles, uploadMediaFile } from './lib/storage';
import { useSupabaseAuth } from './lib/hooks/useSupabaseAuth';
import { usePatients } from './lib/hooks/usePatients';
import { useMedia } from './lib/hooks/useMedia';
import { useStudyGroups } from './lib/hooks/useStudyGroups';
import { useAuditLogs } from './lib/hooks/useAuditLogs';
import { StorageLocation, type AuthUser, type Patient, type StudyGroup } from './types';

const Dashboard = lazy(() => import('./views/Dashboard'));
const PatientDetails = lazy(() => import('./views/PatientDetails'));
const UploadMedia = lazy(() => import('./views/UploadMedia'));
const RecycleBin = lazy(() => import('./views/RecycleBin'));
const AuditTrail = lazy(() => import('./views/AuditTrail'));
const StudyGroupsView = lazy(() => import('./views/StudyGroupsView'));
const StudyGroupDetailView = lazy(() => import('./views/StudyGroupDetailView'));

type StudyModalState = { group: StudyGroup | null } | null;
type RecordActionState = { action: RecordAction; patient: Patient } | null;

const App: React.FC = () => {
  if (!isConfigured) return <SetupScreen />;
  return <AuthenticatedApp />;
};

const AuthenticatedApp: React.FC = () => {
  const auth = useSupabaseAuth();

  if (auth.loading) {
    return <Spinner label="Checking session" className="min-h-screen bg-slate-50" />;
  }
  if (!auth.user) {
    return <AuthScreen onSignIn={auth.signIn} onSignUp={auth.signUp} />;
  }
  return <Workspace user={auth.user} onSignOut={auth.signOut} />;
};

const Workspace: React.FC<{ user: AuthUser; onSignOut: () => Promise<void> }> = ({ user, onSignOut }) => {
  const patientsApi = usePatients(user.id);
  const mediaApi = useMedia(user.id);
  const groupsApi = useStudyGroups(user.id);
  const audit = useAuditLogs(user);

  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [selectedUhid, setSelectedUhid] = useState<string | null>(null);
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [studyModal, setStudyModal] = useState<StudyModalState>(null);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [recordAction, setRecordAction] = useState<RecordActionState>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const { patients, deletedPatients } = patientsApi;
  const { studyGroups } = groupsApi;
  const selectedPatient = selectedUhid ? (patients.find((p) => p.uhid === selectedUhid) ?? null) : null;
  const isLoading = patientsApi.loading || mediaApi.loading || groupsApi.loading;
  const loadError = patientsApi.error ?? mediaApi.error ?? groupsApi.error;

  const dismissNotice = useCallback(() => setNotice(null), []);
  const notifyError = (err: unknown, fallback?: string) =>
    setNotice({ tone: 'error', message: errorMessage(err, fallback) });

  const navigate = (view: ViewId) => {
    setActiveView(view);
    setSelectedUhid(null);
    setSelectedStudyId(null);
    window.scrollTo({ top: 0 });
  };

  const handleAddPatient = async (p: Patient) => {
    await patientsApi.addPatient(p);
    await audit.record('Patient Creation', p.uhid, `Registered new patient record for ${p.name}.`);
    setNotice({ tone: 'success', message: `${p.name} added to the registry.` });
  };

  const handleUpdatePatient = async (updated: Patient) => {
    await patientsApi.updatePatient(updated);
    await audit.record('Patient Correction', updated.uhid, 'Updated clinical details for patient.');
    setPatientToEdit(null);
    setNotice({ tone: 'success', message: 'Patient record updated.' });
  };

  const handleSyncMedia = async (uhid: string, target: StorageLocation) => {
    try {
      await mediaApi.syncMedia(uhid, target);
      await audit.record('Vault Sync', uhid, `Marked all media assets as stored in ${target}.`);
    } catch (err) {
      notifyError(err, 'Could not update storage status.');
    }
  };

  const handleIntake = async (input: IntakeInput) => {
    const patient = patients.find((p) => p.uhid === input.uhid);
    if (!patient) throw new Error('Patient not found. Please register the patient first.');
    const location = input.storageLocation ?? StorageLocation.LOCAL;
    let result;
    try {
      result = await submitIntake(patient, input, {
        addSurgery,
        appendSurgeryNotes,
        uploadFile: (file, index, timestamp) => uploadMediaFile(user.id, patient.uhid, file, index, timestamp),
        removeFiles: removeMediaFiles,
        addMedia: mediaApi.addMedia,
      });
    } finally {
      // A new procedure may have been created even if a later step failed.
      await patientsApi.refetch();
    }
    const summary =
      result.uploaded > 0
        ? `Uploaded ${result.uploaded} asset${result.uploaded === 1 ? '' : 's'} for ${input.stage} phase (${location}).`
        : `Logged clinical notes for ${input.stage} phase.`;
    await audit.record('Intake Upload', patient.uhid, summary);
  };

  const handleRecordAction = async () => {
    if (!recordAction) return;
    const { action, patient } = recordAction;
    if (action === 'soft-delete') {
      await patientsApi.softDelete(patient.uhid);
      setSelectedUhid(null);
      await audit.record('Record Archival', patient.uhid, 'Moved patient record to archive.');
    } else if (action === 'hard-delete') {
      await patientsApi.hardDelete(patient.uhid);
      await mediaApi.refetch();
      await groupsApi.refetch();
      await audit.record('Permanent Scrub', patient.uhid, 'Permanently deleted clinical record.');
    } else {
      await patientsApi.restore(patient.uhid);
      await audit.record('Record Restore', patient.uhid, 'Restored patient record from archive.');
    }
    setRecordAction(null);
  };

  const handleSaveStudyGroup = async (name: string, description: string) => {
    const existing = studyModal?.group;
    if (existing) {
      await groupsApi.updateGroup(existing.id, name, description);
      await audit.record('Group Update', existing.id, `Updated research group: ${name}`);
    } else {
      const id = await groupsApi.createGroup(name, description);
      await audit.record('Group Creation', id, `Created research group: ${name}`);
    }
    setStudyModal(null);
  };

  const handleEnroll = async (uhid: string, group: StudyGroup) => {
    await groupsApi.enrollPatient(group.id, uhid);
    await patientsApi.refetch();
    await audit.record('Group Enrollment', uhid, `Enrolled patient into study group "${group.name}".`);
  };

  const handleUnenroll = async (uhid: string, group: StudyGroup) => {
    await groupsApi.unenrollPatient(group.id, uhid);
    await patientsApi.refetch();
    await audit.record('Group Removal', uhid, `Removed patient from study group "${group.name}".`);
  };

  const renderView = () => {
    if (selectedPatient) {
      return (
        <PatientDetails
          patient={selectedPatient}
          media={mediaApi.media.filter((m) => m.uhid === selectedPatient.uhid)}
          studyGroups={studyGroups}
          onBack={() => setSelectedUhid(null)}
          onAddMedia={() => navigate('upload')}
          onSyncMedia={handleSyncMedia}
          onEditPatient={setPatientToEdit}
          onDeletePatient={(p) => setRecordAction({ action: 'soft-delete', patient: p })}
        />
      );
    }

    if (selectedStudyId) {
      const study = studyGroups.find((s) => s.id === selectedStudyId);
      if (study) {
        return (
          <StudyGroupDetailView
            group={study}
            patients={patients}
            onBack={() => setSelectedStudyId(null)}
            onEditPatient={setPatientToEdit}
            onEnroll={(uhid) => handleEnroll(uhid, study)}
            onUnenroll={(uhid) => handleUnenroll(uhid, study)}
          />
        );
      }
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            patients={patients}
            studyGroups={studyGroups}
            media={mediaApi.media}
            defaultSurgeon={user.name}
            onAddPatient={handleAddPatient}
            onSelectPatient={(p) => setSelectedUhid(p.uhid)}
          />
        );
      case 'upload':
        return (
          <UploadMedia patients={patients} onUpload={handleIntake} onNavigateDashboard={() => navigate('dashboard')} />
        );
      case 'research':
        return (
          <StudyGroupsView
            studyGroups={studyGroups}
            onCreate={() => setStudyModal({ group: null })}
            onEdit={(group) => setStudyModal({ group })}
            onOpen={setSelectedStudyId}
          />
        );
      case 'audit':
        return <AuditTrail logs={audit.logs} error={audit.error} onBack={() => navigate('dashboard')} />;
      case 'recycle':
        return (
          <RecycleBin
            deletedPatients={deletedPatients}
            onRestore={(p) => setRecordAction({ action: 'restore', patient: p })}
            onPermanentDelete={(p) => setRecordAction({ action: 'hard-delete', patient: p })}
            onBack={() => navigate('dashboard')}
          />
        );
    }
  };

  const heading = selectedPatient ? 'Patient Record' : selectedStudyId ? 'Study Group' : VIEW_TITLES[activeView];

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-50 pb-24 selection:bg-teal-100 lg:pb-0">
      <a
        href="#main-content"
        className="sr-only z-[900] rounded-lg bg-slate-900 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Sidebar
        activeView={activeView}
        onNavigate={navigate}
        onLogout={() => void onSignOut()}
        deletedCount={deletedPatients.length}
      />
      <div className="min-h-screen min-w-0 flex-1 lg:ml-64">
        <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-4 backdrop-blur-2xl md:px-12 md:py-5">
          <div className="flex items-center gap-4">
            <div className="block lg:hidden">
              <OpusLogo size="sm" />
            </div>
            <span className="hidden text-[13px] font-black uppercase italic tracking-[0.3em] text-slate-500 lg:inline">
              {heading}
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 shadow-inner md:px-4">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-[12px] font-bold text-white"
                aria-hidden="true"
              >
                {user.name.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden max-w-[12rem] truncate text-[13px] font-black uppercase tracking-widest text-slate-700 sm:inline">
                {user.name}
              </span>
              <span className="sr-only">Signed in as {user.name}</span>
            </div>
            <button
              type="button"
              onClick={() => void onSignOut()}
              aria-label="Sign out"
              className="rounded-xl border border-slate-100 bg-white p-2 text-slate-500 hover:text-red-600 lg:hidden"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-6 md:px-12 md:py-12">
          {loadError && (
            <div
              role="alert"
              className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>Some data could not be loaded: {loadError}</span>
              <button
                type="button"
                onClick={() => {
                  void patientsApi.refetch();
                  void mediaApi.refetch();
                  void groupsApi.refetch();
                }}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm"
              >
                Retry
              </button>
            </div>
          )}
          {isLoading ? (
            <Spinner label="Loading records" className="py-32" />
          ) : (
            <Suspense fallback={<Spinner label="Loading view" className="py-32" />}>{renderView()}</Suspense>
          )}
        </main>
      </div>

      {studyModal && (
        <StudyGroupModal group={studyModal.group} onSave={handleSaveStudyGroup} onClose={() => setStudyModal(null)} />
      )}
      {patientToEdit && (
        <PatientEditModal patient={patientToEdit} onSave={handleUpdatePatient} onClose={() => setPatientToEdit(null)} />
      )}
      {recordAction && (
        <ConfirmActionModal
          action={recordAction.action}
          patient={recordAction.patient}
          onConfirm={handleRecordAction}
          onClose={() => setRecordAction(null)}
        />
      )}
      {notice && <Notice notice={notice} onDismiss={dismissNotice} />}
    </div>
  );
};

export default App;
