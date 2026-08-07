import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '/Users/jeevithgangadhara/Downloads/opus---operative-photo-unite-and-storage/node_modules/@supabase/supabase-js/dist/index.mjs';

const WORKSPACE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const env = {};
for (const line of fs.readFileSync(path.join(WORKSPACE, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const stamp = Date.now();
const U1 = { email: `deeptest-a-${stamp}@test.local`, password: 'TestPass123!', name: 'DeepTest Surgeon A', role: 'Researcher' };
const U2 = { email: `deeptest-b-${stamp}@test.local`, password: 'TestPass123!', name: 'DeepTest Surgeon B' };

const UHID_A = `DEEPTEST-A-${stamp}`;
const UHID_B = `DEEPTEST-B-${stamp}`;
const SURG_A = `surg_a_${stamp}`;
const SURG_B = `surg_b_${stamp}`;

let pass = 0, fail = 0, skipped = 0, info = [];
const results = [];
let currentSection = '';

const section = (name) => { currentSection = name; results.push(`\n=== ${name} ===`); };
const check = (name, ok, detail = '') => {
  if (ok) { pass++; results.push(`  PASS  ${name}${detail ? '  — ' + detail : ''}`); }
  else { fail++; results.push(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); }
};
const soft = (name, ok, detail = '') => {
  if (ok) { pass++; results.push(`  PASS  ${name}${detail ? '  — ' + detail : ''}`); }
  else { skipped++; info.push(`${name}${detail ? ' — ' + detail : ''}`); results.push(`  INFO  ${name}${detail ? '  — ' + detail : ''}`); }
};

// ---------------------------------------------------------------- helpers
const client = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const anon = client();

const mapSurgery = (db) => ({ id: db.id, title: db.title, date: db.date, notes: db.notes ?? undefined, otNotes: db.ot_notes ?? undefined, findingUrl: db.finding_url ?? undefined });
const mapMediaEntry = (db) => ({ id: db.id, uhid: db.patient_uhid, surgeryId: db.surgery_id ?? '', stage: db.stage, type: db.type, url: db.url, thumbnailUrl: db.thumbnail_url ?? undefined, uploadedAt: db.uploaded_at, notes: db.notes ?? undefined, tags: db.tags ?? [], storageLocation: db.storage_location });
const mapPatient = (db) => ({ uhid: db.uhid, name: db.name, ageYears: db.age_years, ageMonths: db.age_months ?? undefined, gender: db.gender, diagnosis: db.diagnosis, primarySurgeon: db.primary_surgeon, studyGroupIds: db.study_groups?.map(s => s.study_group_id) ?? [], createdAt: db.created_at, dateOfSurgery: db.date_of_surgery ?? undefined, deletedAt: db.deleted_at ?? undefined, surgeries: (db.surgeries ?? []).map(mapSurgery) });
const mapGroup = (db) => ({ id: db.id, name: db.name, description: db.description, patientCount: db.patient_count?.[0]?.count ?? 0 });
const mapAudit = (db) => ({ id: db.id, userId: db.user_id, userName: db.user_name, action: db.action, targetId: db.target_id, details: db.details, timestamp: db.timestamp });

const fetchPatients = async (c) => {
  const active = await c.from('patients').select('*, surgeries(*), study_groups:study_group_patients(study_group_id)').is('deleted_at', null).order('created_at', { ascending: false });
  const deleted = await c.from('patients').select('*, surgeries(*), study_groups:study_group_patients(study_group_id)').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  return { active: (active.data ?? []).map(mapPatient), deleted: (deleted.data ?? []).map(mapPatient) };
};
const fetchMedia = async (c) => {
  const { data } = await c.from('media_entries').select('*').order('uploaded_at', { ascending: false });
  return (data ?? []).map(mapMediaEntry);
};
const fetchGroups = async (c) => {
  const { data } = await c.from('study_groups').select('*, patient_count:study_group_patients(count)').order('created_at', { ascending: false });
  return (data ?? []).map(mapGroup);
};
const fetchAudit = async (c) => {
  const { data } = await c.from('audit_entries').select('*').order('timestamp', { ascending: false });
  return (data ?? []).map(mapAudit);
};

const addAuditEntry = (c, user, action, targetId, details) =>
  c.from('audit_entries').insert({ user_id: user.id, user_name: user.name, action, target_id: targetId, details, timestamp: new Date().toISOString() });

// view-logic mirrors
const dashboardGetPOD = (patient) => {
  if (!patient.surgeries || patient.surgeries.length === 0) return null;
  const latest = patient.surgeries.reduce((l, s) => new Date(s.date) > new Date(l) ? s.date : l, patient.surgeries[0].date);
  const diff = Math.floor((new Date().getTime() - new Date(latest).getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
};
const dashboardFeed = (media, patients) => [
  ...media.map(m => ({ type: 'media', item: m, date: m.uploadedAt })),
  ...patients.flatMap(p => p.surgeries.filter(s => s.otNotes).map(s => ({ type: 'notes', item: { ...s, uhid: p.uhid, name: p.name }, date: s.date }))),
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
const uploadMediaPOD = (selectedPatient, stage, surgeryId, showNewSurgeryForm, newSurgeryDate) => {
  if (stage !== 'Post-operative' || !selectedPatient) return null;
  const d = showNewSurgeryForm ? newSurgeryDate : (selectedPatient.surgeries.find(s => s.id === surgeryId)?.date || '');
  if (!d) return null;
  const diff = Math.floor((new Date().getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
};
const uploadValidate = (selectedPatientId, hasFilesOrNotes, hasSurgeries, showNewSurgeryForm) => {
  if (!selectedPatientId) return 'Please select a patient from the registry first.';
  if (!hasFilesOrNotes) return 'Please attach at least one asset or enter clinical notes.';
  if (!showNewSurgeryForm && !hasSurgeries) return 'This patient has no procedures. Please create one using "+ New Procedure".';
  return null;
};
const recycleDaysRemaining = (deletedAt) => {
  const diff = Math.ceil((new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};
const auditFilter = (logs, term) => logs.filter(l => l.userName.toLowerCase().includes(term.toLowerCase()) || l.action.toLowerCase().includes(term.toLowerCase()) || l.targetId.toLowerCase().includes(term.toLowerCase()) || l.details.toLowerCase().includes(term.toLowerCase())).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// ---------------------------------------------------------------- run
let userA = null, userB = null;
try {
  // ============ PHASE 1: AUTH ============
  section('P1. Auth — signup, signin, session, signout');

  const a = client();
  const b = client();

  const { data: suA, error: seA } = await a.auth.signUp({ email: U1.email, password: U1.password, options: { data: { name: U1.name, role: U1.role } } });
  check('U1 signup succeeds', !seA, seA?.message ?? '');
  check('U1 signup returns session (email confirm disabled)', !!suA.session, suA.session ? '' : 'session null');
  userA = { id: suA.user?.id ?? null, name: U1.name, role: U1.role, email: U1.email };

  const { data: suB, error: seB } = await b.auth.signUp({ email: U2.email, password: U2.password, options: { data: { name: U2.name } } });
  check('U2 signup succeeds', !seB, seB?.message ?? '');
  check('U2 signup returns session', !!suB.session);
  userB = { id: suB.user?.id ?? null, name: U2.name, role: 'Surgeon', email: U2.email };

  const pA = await a.from('profiles').select('*').eq('id', userA.id).single();
  check('trigger creates profile for U1', !pA.error && pA.data?.name === U1.name && pA.data?.role === U1.role, pA.error?.message ?? JSON.stringify({ name: pA.data?.name, role: pA.data?.role }));
  const pB = await b.from('profiles').select('*').eq('id', userB.id).single();
  check('trigger creates profile for U2 with default role', !pB.error && pB.data?.role === 'Surgeon' && pB.data?.name === U2.name, pB.error?.message ?? '');

  await a.auth.signOut();
  const afterOut = await a.auth.getSession();
  check('signOut clears session', !afterOut.data.session);

  const wrong = await a.auth.signInWithPassword({ email: U1.email, password: 'wrongpass123' });
  check('signin with wrong password returns error', !!wrong.error, wrong.error?.message ?? '');
  check('signin with wrong password leaves no session', !wrong.data.session);

  const siA = await a.auth.signInWithPassword({ email: U1.email, password: U1.password });
  check('U1 re-signin succeeds', !siA.error, siA.error?.message ?? '');
  const siB = await b.auth.signInWithPassword({ email: U2.email, password: U2.password });
  check('U2 re-signin succeeds', !siB.error);

  const sessA = await a.auth.getSession();
  check('session persists after signin (getSession)', !!sessA.data.session?.user?.id);

  // ============ PHASE 1b: RLS ============
  section('P1b. RLS isolation + unauthenticated access');

  const isoPatient = await a.from('patients').select('*').eq('uhid', UHID_B);
  check('U1 reading nonexistent/U2 data returns empty (no leak)', (isoPatient.data ?? []).length === 0 && !isoPatient.error);

  const unAuthSelect = await anon.from('patients').select('uhid').limit(5);
  check('unauthenticated select blocked by RLS', (unAuthSelect.data ?? []).length === 0, unAuthSelect.error?.message ?? '0 rows returned');
  const unAuthInsert = await anon.from('patients').insert({ uhid: `UNAUTH-${stamp}`, name: 'x', age_years: 1, gender: 'Other', diagnosis: '', primary_surgeon: '' });
  check('unauthenticated insert rejected by RLS', !!unAuthInsert.error, unAuthInsert.error?.message ?? 'no error — LEAK');
  await anon.from('patients').delete().eq('uhid', `UNAUTH-${stamp}`);
  const unAuthAudit = await anon.from('audit_entries').select('id').limit(1);
  check('unauthenticated audit read blocked', (unAuthAudit.data ?? []).length === 0);

  // ============ PHASE 2: PATIENTS ============
  section('P2. Patients — create, search, edit, lifecycle');

  const today = new Date().toISOString().split('T')[0];
  const { error: insA } = await a.from('patients').insert({ uhid: UHID_A, name: 'DeepTest Alpha', age_years: 41, gender: 'Female', diagnosis: 'Knee osteoarthritis', primary_surgeon: 'Dr. A', created_at: new Date().toISOString(), date_of_surgery: today });
  check('create patient (usePatients.addPatient)', !insA, insA?.message ?? '');
  const { error: insASurg } = await a.from('surgeries').insert({ id: SURG_A, patient_uhid: UHID_A, title: 'Primary Surgery', date: today });
  check('auto-surgery insert (dateOfSurgery path)', !insASurg, insASurg?.message ?? '');
  const { error: dupErr } = await a.from('patients').insert({ uhid: UHID_A, name: 'Dup', age_years: 1, gender: 'Other', diagnosis: '', primary_surgeon: '' });
  check('duplicate UHID rejected (PK)', !!dupErr, dupErr?.message ?? 'no error — overwrite risk');

  let { active, deleted } = await fetchPatients(a);
  let mine = active.filter(p => p.uhid === UHID_A);
  check('patient appears in active registry fetch', mine.length === 1);
  check('patient mapped with surgery embedded (usePatients select)', mine[0]?.surgeries?.length === 1 && mine[0]?.surgeries?.[0]?.id === SURG_A, JSON.stringify(mine[0]?.surgeries));
  const searchMatches = active.filter(p => p.uhid.toLowerCase().includes('deeptest') || p.name.toLowerCase().includes('deeptest'));
  check('dashboard search by name/UHID (case-insensitive)', searchMatches.some(p => p.uhid === UHID_A));
  const pod = dashboardGetPOD(mine[0]);
  check('dashboard POD computed (surgery today → 0)', pod === 0, `pod=${pod}`);
  const uploadPod = uploadMediaPOD(mine[0], 'Post-operative', SURG_A, false, '');
  check('upload currentPOD computed (surgery today → 0)', uploadPod === 0, `pod=${uploadPod}`);

  const { error: updErr } = await a.from('patients').upsert({ uhid: UHID_A, name: 'DeepTest Alpha Renamed', age_years: 42, gender: 'Female', diagnosis: 'Revised diagnosis', primary_surgeon: 'Dr. A' });
  check('update patient (usePatients.updatePatient upsert)', !updErr, updErr?.message ?? '');
  ({ active } = await fetchPatients(a));
  check('updated patient reflects in registry', active.find(p => p.uhid === UHID_A)?.name === 'DeepTest Alpha Renamed' && active.find(p => p.uhid === UHID_A)?.diagnosis === 'Revised diagnosis');

  const { error: softErr } = await a.from('patients').update({ deleted_at: new Date().toISOString() }).eq('uhid', UHID_A);
  check('soft delete (usePatients.softDelete)', !softErr, softErr?.message ?? '');
  ({ active, deleted } = await fetchPatients(a));
  check('soft-deleted patient leaves active registry', !active.some(p => p.uhid === UHID_A));
  check('soft-deleted patient enters archive list (recycle bin source)', deleted.some(p => p.uhid === UHID_A));
  const archived = deleted.find(p => p.uhid === UHID_A);
  check('archive retention countdown (~30 days)', archived && recycleDaysRemaining(archived.deletedAt) >= 25 && recycleDaysRemaining(archived.deletedAt) <= 31, `days=${archived ? recycleDaysRemaining(archived.deletedAt) : 'n/a'}`);
  const oldDays = recycleDaysRemaining(new Date(Date.now() - 40 * 86400000).toISOString());
  check('retention floors at 0 when past purge', oldDays === 0, `days=${oldDays}`);

  const { error: restErr } = await a.from('patients').update({ deleted_at: null }).eq('uhid', UHID_A);
  check('restore (usePatients.restore)', !restErr, restErr?.message ?? '');
  ({ active } = await fetchPatients(a));
  check('restored patient back in active registry', active.some(p => p.uhid === UHID_A));

  // ============ PHASE 3: STUDY GROUPS ============
  section('P3. Study groups — create, update, enroll, unenroll');

  const { data: grp, error: grpErr } = await a.from('study_groups').insert({ name: 'DeepTest Cohort', description: 'Protocol X' }).select('id').single();
  check('create group (useStudyGroups.createGroup)', !grpErr && !!grp?.id, grpErr?.message ?? '');
  const GID = grp?.id ?? '';
  let groups = await fetchGroups(a);
  let g = groups.find(x => x.id === GID);
  check('new group reflects with count 0', !!g && g.patientCount === 0, JSON.stringify(g));

  const { error: upgErr } = await a.from('study_groups').update({ name: 'DeepTest Cohort V2', description: 'Protocol Y' }).eq('id', GID);
  check('update group (useStudyGroups.updateGroup)', !upgErr, upgErr?.message ?? '');
  groups = await fetchGroups(a);
  check('updated group reflects', groups.find(x => x.id === GID)?.name === 'DeepTest Cohort V2');

  const { error: enrErr } = await a.from('study_group_patients').insert({ study_group_id: GID, patient_uhid: UHID_A });
  check('enroll patient (useStudyGroups.enrollPatient)', !enrErr, enrErr?.message ?? '');
  groups = await fetchGroups(a);
  g = groups.find(x => x.id === GID);
  check('group count reflects enrollment (count aggregate)', g?.patientCount === 1, `count=${g?.patientCount}`);
  const pat = (await fetchPatients(a)).active.find(p => p.uhid === UHID_A);
  check('patient.studyGroupIds reflects membership (join fetch)', pat?.studyGroupIds?.includes(GID) ?? false, JSON.stringify(pat?.studyGroupIds));

  const { error: unErr } = await a.from('study_group_patients').delete().eq('study_group_id', GID).eq('patient_uhid', UHID_A);
  check('unenroll patient (useStudyGroups.unenrollPatient)', !unErr, unErr?.message ?? '');
  groups = await fetchGroups(a);
  check('group count back to 0 after unenroll', groups.find(x => x.id === GID)?.patientCount === 0);

  // cross-user integrity check
  const { error: bPatientErr } = await b.from('patients').insert({ uhid: UHID_B, name: 'DeepTest Beta', age_years: 55, gender: 'Male', diagnosis: 'Hip OA', primary_surgeon: 'Dr. B' });
  check('B creates own patient (setup)', !bPatientErr, bPatientErr?.message ?? '');
  const { error: crossEnrollErr } = await a.from('study_group_patients').insert({ study_group_id: GID, patient_uhid: UHID_B });
  const crossEnrollAllowed = !crossEnrollErr;
  check('A cannot enroll B\'s patient into A\'s group (patient ownership enforced)', !crossEnrollAllowed, crossEnrollAllowed ? 'ALLOWED — patient ownership NOT checked by RLS policy (security gap)' : crossEnrollErr.message);
  await a.from('study_group_patients').delete().eq('study_group_id', GID).eq('patient_uhid', UHID_B);

  // group ownership cross-check
  const { data: crossGrp } = await b.from('study_groups').select('id').eq('id', GID);
  check('B cannot read A\'s group (RLS)', (crossGrp ?? []).length === 0);

  // ============ PHASE 4: MEDIA ============
  section('P4. Media — upload, reflect, sync, constraints, cascade');

  const m1 = { patient_uhid: UHID_A, surgery_id: SURG_A, stage: 'Pre-operative', type: 'image', url: `https://picsum.photos/seed/${stamp}1/1200/900`, uploaded_at: new Date().toISOString(), tags: [], storage_location: 'Local Storage' };
  const m2 = { patient_uhid: UHID_A, surgery_id: SURG_A, stage: 'Intra-operative', type: 'video', url: `https://example.com/${stamp}.mp4`, uploaded_at: new Date().toISOString(), tags: ['clips'], storage_location: 'Local Storage' };
  const m3 = { patient_uhid: UHID_A, surgery_id: SURG_A, stage: 'Post-operative', type: 'audio', url: `https://example.com/${stamp}.mp3`, notes: 'Voice Memo', uploaded_at: new Date().toISOString(), tags: [], storage_location: 'Local Storage' };
  const m4 = { patient_uhid: UHID_A, surgery_id: SURG_A, stage: 'Pre-operative', type: 'pdf', url: `https://example.com/${stamp}.pdf`, thumbnail_url: null, uploaded_at: new Date().toISOString(), tags: [], storage_location: 'Local Storage' };
  let ok = true; let msg = '';
  for (const m of [m1, m2, m3, m4]) { const { error } = await a.from('media_entries').insert(m); if (error) { ok = false; msg = error.message; } }
  check('insert all 4 media types (useMedia.addMedia)', ok, msg);

  // Storage round-trip (real file → public URL → fetch → delete)
  const storagePath = `${userA.id}/${UHID_A}/test-${stamp}.png`;
  const fakePng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const { error: upObjErr } = await a.storage.from('opus-media').upload(storagePath, fakePng, { contentType: 'image/png' });
  check('storage: upload object to opus-media (authenticated)', !upObjErr, upObjErr?.message ?? '');
  const pubUrl = a.storage.from('opus-media').getPublicUrl(storagePath).data.publicUrl;
  let httpOk = false;
  try { const r = await fetch(pubUrl); httpOk = r.status === 200; } catch { httpOk = false; }
  check('storage: public URL serves the file (HTTP 200)', httpOk, pubUrl);
  const { error: crossObjErr } = await b.storage.from('opus-media').upload(`${userA.id}/${UHID_A}/foreign-${stamp}.png`, fakePng, { contentType: 'image/png' });
  check('storage: B cannot upload into A\'s folder (RLS)', !!crossObjErr, crossObjErr ? crossObjErr.message : 'ALLOWED — folder isolation broken');
  const { error: delObjErr } = await a.storage.from('opus-media').remove([storagePath]);
  check('storage: object deleted (cleanup)', !delObjErr, delObjErr?.message ?? '');

  let bad = await a.from('media_entries').insert({ ...m1, stage: 'Not-a-stage' });
  check('CHECK constraint rejects invalid stage', !!bad.error, bad.error?.message ?? 'no error');
  bad = await a.from('media_entries').insert({ ...m1, type: 'dicom' });
  check('CHECK constraint rejects invalid type', !!bad.error, bad.error?.message ?? 'no error');
  bad = await a.from('media_entries').insert({ ...m1, storage_location: 'NAS Drive' });
  check('CHECK constraint rejects invalid storage_location', !!bad.error, bad.error?.message ?? 'no error');
  bad = await a.from('media_entries').insert({ ...m1, patient_uhid: `NOPE-${stamp}` });
  check('FK rejects media for nonexistent patient', !!bad.error, bad.error?.message ?? 'no error');

  let media = await fetchMedia(a);
  const mineMedia = media.filter(m => m.uhid === UHID_A);
  check('uploaded media reflects in fetchMedia (all 4)', mineMedia.length === 4, `count=${mineMedia.length}`);
  const ordered = [...media].sort((x, y) => new Date(y.uploadedAt) - new Date(x.uploadedAt));
  check('fetchMedia ordered uploaded_at desc', media.every((m, i) => m.uploadedAt === ordered[i].uploadedAt));

  const feed = dashboardFeed(media, (await fetchPatients(a)).active);
  const feedHasMine = feed.some(e => e.type === 'media' && e.item.uhid === UHID_A);
  check('media reflects in dashboard Recent Activity feed', feedHasMine);
  const feedSorted = feed.every((e, i) => i === 0 || new Date(feed[i - 1].date) >= new Date(e.date));
  check('dashboard feed sorted desc by date', feedSorted);
  check('dashboard feed capped at 15', feed.length <= 15, `len=${feed.length}`);
  const { error: noteErr } = await a.from('surgeries').update({ ot_notes: 'Fracture fixation completed.' }).eq('id', SURG_A);
  check('add ot_notes to surgery (notes source)', !noteErr, noteErr?.message ?? '');
  ({ active } = await fetchPatients(a));
  const feed2 = dashboardFeed(media, active);
  const notesEntry = feed2.find(e => e.type === 'notes' && e.item.uhid === UHID_A);
  check('ot_notes surgery reflects in feed as notes entry', !!notesEntry, JSON.stringify(notesEntry?.item?.otNotes));

  const pdFiltered = media.filter(m => m.surgeryId === SURG_A && m.stage === 'Pre-operative');
  check('PatientDetails filter (surgeryId + stage) shows 2', pdFiltered.length === 2, `count=${pdFiltered.length}`);
  const syncStats = { total: mineMedia.length, cloud: mineMedia.filter(m => m.storageLocation === 'Google Drive').length, local: mineMedia.filter(m => m.storageLocation === 'Local Storage').length };
  check('syncStats counts (total/cloud/local)', syncStats.total === 4 && syncStats.cloud === 0 && syncStats.local === 4, JSON.stringify(syncStats));

  const { error: syncErr } = await a.from('media_entries').update({ storage_location: 'Google Drive' }).eq('patient_uhid', UHID_A);
  check('cloud sync update (useMedia.syncMedia)', !syncErr, syncErr?.message ?? '');
  media = await fetchMedia(a);
  const afterSync = media.filter(m => m.uhid === UHID_A);
  check('sync reflects: all media now cloud', afterSync.every(m => m.storageLocation === 'Google Drive') && afterSync.length === 4);
  const syncStats2 = { total: afterSync.length, cloud: afterSync.filter(m => m.storageLocation === 'Google Drive').length, local: afterSync.filter(m => m.storageLocation === 'Local Storage').length };
  check('syncStats reflects 4/0 after sync (UI toggle state)', syncStats2.cloud === 4 && syncStats2.local === 0);
  const { error: syncBackErr } = await a.from('media_entries').update({ storage_location: 'Local Storage' }).eq('patient_uhid', UHID_A);
  check('reverse sync back to local', !syncBackErr, syncBackErr?.message ?? '');

  const { error: delSurgErr } = await a.from('surgeries').delete().eq('id', SURG_A);
  check('delete surgery (schema test)', !delSurgErr, delSurgErr?.message ?? '');
  media = await fetchMedia(a);
  const afterSurgDel = media.filter(m => m.uhid === UHID_A);
  check('media survives surgery delete with surgery_id NULL (SET NULL)', afterSurgDel.length === 4 && afterSurgDel.every(m => m.surgeryId === ''), JSON.stringify(afterSurgDel.map(m => m.surgeryId)));

  const v1 = uploadValidate('', true, true, false);
  check('upload validation: no patient selected → error', v1 === 'Please select a patient from the registry first.', v1 ?? 'no error');
  const v2 = uploadValidate(UHID_A, false, true, false);
  check('upload validation: no files + no notes → error', v2 === 'Please attach at least one asset or enter clinical notes.', v2 ?? 'no error');
  const noSurgPatient = { uhid: `NOSURG-${stamp}`, surgeries: [] };
  const v3 = uploadValidate('X', true, noSurgPatient.surgeries.length > 0, false);
  check('upload validation: patient without procedure → error', v3 === 'This patient has no procedures. Please create one using "+ New Procedure".', v3 ?? 'no error');
  const v4 = uploadValidate('X', true, false, true);
  check('upload validation: new-procedure flow bypasses surgery check', v4 === null);

  const { error: aud1 } = await a.from('audit_entries').insert({ user_id: userA.id, user_name: userA.name, action: 'Intake Upload', target_id: UHID_A, details: 'Uploaded session assets for Pre-operative phase.' });
  check('audit: Intake Upload written', !aud1, aud1?.message ?? '');

  const { error: cascadeErr } = await a.from('patients').delete().eq('uhid', UHID_A);
  check('hard delete patient (usePatients.hardDelete)', !cascadeErr, cascadeErr?.message ?? '');
  media = await fetchMedia(a);
  check('hard delete cascades: media purged with patient', !media.some(m => m.uhid === UHID_A));
  ({ active, deleted } = await fetchPatients(a));
  check('hard delete: patient gone from active AND archive', !active.some(p => p.uhid === UHID_A) && !deleted.some(p => p.uhid === UHID_A));
  const mems = await a.from('study_group_patients').select('patient_uhid').eq('patient_uhid', UHID_A);
  check('hard delete cascades: group memberships removed', (mems.data ?? []).length === 0);

  // ============ PHASE 5: AUDIT ============
  section('P5. Audit trail — all actions, filter, sort');

  const actions = [
    ['Patient Creation', UHID_A, 'Registered new patient record for test.'],
    ['Patient Correction', UHID_A, 'Updated clinical details for patient.'],
    ['Vault Sync', UHID_A, 'Synchronized all media assets to Google Drive.'],
    ['Record Archival', UHID_A, 'Moved patient record to recycle bin.'],
    ['Permanent Scrub', UHID_A, 'Permanently purged clinical record.'],
    ['Record Restore', UHID_A, 'Restored patient record from archive.'],
    ['Group Creation', GID, 'Initialized research group: test'],
    ['Group Update', GID, 'Updated research group parameters.'],
    ['Group Enrollment', UHID_A, 'Enrolled patient into study group.'],
    ['Group Removal', UHID_A, 'Removed patient from study group.'],
  ];
  let allOk = true; let aMsg = '';
  for (const [action, tid, details] of actions) {
    const { error } = await a.from('audit_entries').insert({ user_id: userA.id, user_name: userA.name, action, target_id: tid, details });
    if (error) { allOk = false; aMsg = error.message; }
  }
  check('all 10 remaining action types written', allOk, aMsg);
  let logs = await fetchAudit(a);
  const mineLogs = logs.filter(l => l.userId === userA.id);
  check('audit logs read back (useAuditLogs)', mineLogs.length >= 10, `count=${mineLogs.length}`);
  const uniq = new Set(mineLogs.map(l => l.action));
  const expected = ['Intake Upload', ...actions.map(x => x[0])];
  check('all expected action types present', expected.every(a2 => uniq.has(a2)), JSON.stringify([...uniq]));
  const sorted = [...mineLogs].sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp));
  check('audit sorted desc by timestamp', mineLogs.every((l, i) => l.timestamp === sorted[i].timestamp));
  const filtered = auditFilter(mineLogs, 'vault sync');
  check('audit search filter (case-insensitive, all fields)', filtered.length === 1 && filtered[0].action === 'Vault Sync', `count=${filtered.length}`);

  const { data: bLogs } = await b.from('audit_entries').select('user_id').eq('user_id', userA.id);
  check('B cannot read A\'s audit entries (RLS)', (bLogs ?? []).length === 0);

  // ============ PHASE 6: CLEANUP ============
  section('P6. Cleanup');

  await a.from('study_group_patients').delete().eq('study_group_id', GID);
  await a.from('study_groups').delete().eq('id', GID);
  await a.from('media_entries').delete().eq('patient_uhid', UHID_A);
  await a.from('surgeries').delete().eq('patient_uhid', UHID_A);
  await a.from('patients').delete().eq('uhid', UHID_A);
  await a.from('patients').delete().eq('uhid', UHID_B);
  const audBefore = (await fetchAudit(a)).filter(l => l.userId === userA.id || l.userId === userB.id).length;
  await a.from('audit_entries').delete().eq('user_id', userA.id);
  await b.from('audit_entries').delete().eq('user_id', userB.id);
  const audAfter = (await fetchAudit(a)).filter(l => l.userId === userA.id || l.userId === userB.id).length;
  if (audAfter > 0) info.push(`${audAfter} audit rows left behind (of ${audBefore}): no DELETE RLS policy on audit_entries — immutable by design`);

  for (const [c, u] of [[a, userA], [b, userB]]) {
    const { error } = await c.auth.admin.deleteUser(u.id);
    if (error) info.push(`test user ${u.email} left in auth (needs service_role to delete): ${error.message}`);
  }

  const leftoverA = await fetchPatients(a);
  const leftoverMedia = await fetchMedia(a);
  check('all test data rows cleaned (patients)', !leftoverA.active.some(p => p.uhid.startsWith('DEEPTEST')) && !leftoverA.deleted.some(p => p.uhid.startsWith('DEEPTEST')));
  check('all test data rows cleaned (media)', !leftoverMedia.some(m => m.uhid.startsWith('DEEPTEST')));
} catch (e) {
  check('suite crashed', false, e.message);
  console.error(e);
}

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed, ${skipped} informational`);
if (info.length) console.log('\nNotes:\n' + info.map(i => `  - ${i}`).join('\n'));
process.exit(fail > 0 ? 1 : 0);
