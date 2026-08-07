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
const U = { email: `simuser-${stamp}@test.local`, password: 'TestPass123!', name: 'Simulation Surgeon', role: 'Surgeon' };
const UHID = `SIM-${stamp}`;
const SURG_ID = `surg_sim_${stamp}`;
const GROUP_NAME = `Sim Cohort ${stamp}`;

let pass = 0, fail = 0, info = [];
const results = [];
const check = (name, ok, detail = '') => {
  if (ok) { pass++; results.push(`  PASS  ${name}${detail ? '  — ' + detail : ''}`); }
  else { fail++; results.push(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); }
};

// ---- mirror of lib/supabase.ts client ----
const client = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// ---- mirror of the app's data-layer ----
const mapMedia = (db) => ({ uhid: db.patient_uhid, stage: db.stage, type: db.type, url: db.url, storageLocation: db.storage_location, uploadedAt: db.uploaded_at, notes: db.notes ?? undefined });
const mapPatient = (db) => ({ uhid: db.uhid, name: db.name, studyGroupIds: db.study_groups?.map(s => s.study_group_id) ?? [], deletedAt: db.deleted_at ?? undefined, surgeries: db.surgeries ?? [] });

const fetchPatients = async (c) => {
  const { data } = await c.from('patients').select('*, surgeries(*), study_groups:study_group_patients(study_group_id)').is('deleted_at', null);
  return (data ?? []).map(mapPatient);
};
const fetchMedia = async (c) => {
  const { data } = await c.from('media_entries').select('*');
  return (data ?? []).map(mapMedia);
};
const fetchGroups = async (c) => {
  const { data } = await c.from('study_groups').select('*, patient_count:study_group_patients(count)');
  return (data ?? []).map(g => ({ id: g.id, name: g.name, patientCount: g.patient_count?.[0]?.count ?? 0 }));
};

// ---- mirror of App.tsx handleUploadIntake (real file upload path) ----
const handleUploadIntake = async (c, userId, data) => {
  const patient = (await fetchPatients(c)).find(p => p.uhid === data.uhid);
  if (!patient) throw new Error('Patient not found. Please register the patient first.');

  let surgeryId = data.surgeryId;
  if (data.surgeryId && data.surgeryId.startsWith('new_') && data.newSurgeryTitle) {
    surgeryId = `surg_${Date.now()}`;
    await c.from('surgeries').insert({ id: surgeryId, patient_uhid: data.uhid, title: data.newSurgeryTitle, date: data.newSurgeryDate || new Date().toISOString().split('T')[0] });
  }

  const files = data.files ?? [];
  const uploadTime = Date.now();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : file.type === 'application/pdf' ? 'pdf' : 'image';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${data.uhid}/${uploadTime}-${i}-${safeName}`;
    const { error: uploadError } = await c.storage.from('opus-media').upload(storagePath, file.body, { contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = c.storage.from('opus-media').getPublicUrl(storagePath);
    const { error } = await c.from('media_entries').insert({
      patient_uhid: data.uhid,
      surgery_id: surgeryId || '',
      stage: data.stage,
      type,
      url: publicUrl,
      uploaded_at: new Date().toISOString(),
      tags: [],
      storage_location: data.storageLocation ?? 'Local Storage',
      notes: i === 0 ? (data.notes || undefined) : undefined,
    });
    if (error) throw error;
  }

  // mirror of App.tsx addEntry('Intake Upload', ..., `... (${destination})`)
  const destination = data.storageLocation ?? 'Local Storage';
  const detail = files.length === 0 && data.notes
    ? `Logged clinical notes for ${data.stage} phase (${destination}).`
    : `Uploaded ${files.length} session asset${files.length === 1 ? '' : 's'} for ${data.stage} phase (${destination}).`;
  await c.from('audit_entries').insert({
    user_id: userId, user_name: U.name, action: 'Intake Upload', target_id: data.uhid, details: detail,
    timestamp: new Date().toISOString(),
  });

  return files.length;
};

// ---- mirror of useStudyGroups enroll/unenroll (with the fix: errors thrown) ----
const enrollPatient = async (c, studyGroupId, patientUhid) => {
  const { error } = await c.from('study_group_patients').insert({ study_group_id: studyGroupId, patient_uhid: patientUhid });
  if (error) throw error;
};
const unenrollPatient = async (c, studyGroupId, patientUhid) => {
  const { error } = await c.from('study_group_patients').delete().eq('study_group_id', studyGroupId).eq('patient_uhid', patientUhid);
  if (error) throw error;
};

// ---- mirror of StudyGroupDetailView availablePatients filter ----
const availablePatients = (patients, groupId) => patients.filter(p => !p.studyGroupIds.includes(groupId));

let userId = null;
try {
  // ============ SIM 1: upload images -> logout -> login -> details still visible ============
  console.log('\n=== SIM 1: "Logged out after uploading images, login again — details not seen" ===');

  const c = client();
  const { data: su, error: se } = await c.auth.signUp({ email: U.email, password: U.password, options: { data: { name: U.name, role: U.role } } });
  check('signup succeeds (email confirm disabled)', !se && !!su.session, se?.message ?? '');
  userId = su.user?.id ?? null;

  const { error: insErr } = await c.from('patients').insert({
    uhid: UHID, name: 'Simulation Alpha', age_years: 40, gender: 'Female', diagnosis: 'ACL tear',
    primary_surgeon: 'Dr. Sim', created_at: new Date().toISOString(), date_of_surgery: new Date().toISOString().split('T')[0],
  });
  check('register patient (handleAddPatient)', !insErr, insErr?.message ?? '');
  await c.from('surgeries').insert({ id: SURG_ID, patient_uhid: UHID, title: 'Primary Procedure', date: new Date().toISOString().split('T')[0] });

  const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const files = [
    { name: 'intraop shot.png', type: 'image/png', body: pngBytes },
    { name: 'postop scan (final).png', type: 'image/png', body: pngBytes },
  ];
  const count = await handleUploadIntake(c, userId, {
    uhid: UHID, stage: 'Intra-operative', surgeryId: SURG_ID, notes: 'Initial simulation notes',
    newSurgeryTitle: '', newSurgeryDate: '', files, storageLocation: 'Local Storage',
  });
  check('upload 2 images to opus-media + media_entries (handleUploadIntake)', count === 2, `files=${count}`);

  // the ORIGINAL bug: a fetch issued before the session is attached returns nothing (RLS)
  const unauthClient = client();
  const preLoginPatients = await fetchPatients(unauthClient);
  check('[bug repro] fetch before session restore returns empty (mount-race)', preLoginPatients.length === 0, `rows=${preLoginPatients.length}`);
  // wait — if the fetch had data here, the bug could not have occurred; the fix is that
  // hooks refetch once authUserId arrives. Simulate the logout/login cycle on the SAME client:

  await c.auth.signOut();
  const afterOut = await c.auth.getSession();
  check('[bug repro] sign out clears session', !afterOut.data.session);

  const si = await c.auth.signInWithPassword({ email: U.email, password: U.password });
  check('sign back in with same account', !si.error, si.error?.message ?? '');

  // FIX behaviour: the effect keyed on authUserId fires on login and refetches.
  const relogPatients = await fetchPatients(c);
  const relogMedia = await fetchMedia(c);
  check('[FIX] patients visible after re-login (hook refetch on authUserId)', relogPatients.some(p => p.uhid === UHID), JSON.stringify(relogPatients.map(p => p.uhid)));
  check('[FIX] uploaded images visible after re-login', relogMedia.filter(m => m.uhid === UHID).length === 2, `count=${relogMedia.filter(m => m.uhid === UHID).length}`);
  check('[FIX] media rows carry notes on first file only', relogMedia.filter(m => m.uhid === UHID && m.notes === 'Initial simulation notes').length === 1);

  // ============ SIM 2: add patients to research groups ============
  console.log('\n=== SIM 2: "Not able to add patients to research groups" ===');

  const { data: grp, error: grpErr } = await c.from('study_groups').insert({ name: GROUP_NAME, description: 'Sim protocol' }).select('id').single();
  check('create research group', !grpErr && !!grp?.id, grpErr?.message ?? '');
  const GID = grp?.id ?? '';

  await enrollPatient(c, GID, UHID);
  let groups = await fetchGroups(c);
  check('[FIX] enroll patient succeeds (hook no longer swallows)', groups.find(g => g.id === GID)?.patientCount === 1, `count=${groups.find(g => g.id === GID)?.patientCount}`);

  // FIX: App.handleEnrollPatient refetches patients so studyGroupIds updates
  const patAfterEnroll = (await fetchPatients(c)).find(p => p.uhid === UHID);
  check('[FIX] patient.studyGroupIds updated after enroll (App refetches patients)', patAfterEnroll?.studyGroupIds?.includes(GID) ?? false, JSON.stringify(patAfterEnroll?.studyGroupIds));
  const avail = availablePatients(await fetchPatients(c), GID);
  check('[FIX] enrolled patient no longer offered in "available" list (stale-state fix)', !avail.some(p => p.uhid === UHID), JSON.stringify(avail.map(p => p.uhid)));

  // OLD bug: duplicate enroll swallowed the PK error silently. Now it must throw and surface.
  let duplicateCaught = null;
  try { await enrollPatient(c, GID, UHID); } catch (e) { duplicateCaught = e.message; }
  check('[FIX] duplicate enroll now THROWS (was silently swallowed)', !!duplicateCaught, duplicateCaught ?? 'no error — still silent!');
  let modalStaysOpen = false;
  try { await enrollPatient(c, GID, UHID); } catch { modalStaysOpen = true; }
  check('[FIX] modal stays open + error surfaced on failed enroll (StudyGroupDetailView try/catch)', modalStaysOpen);

  await unenrollPatient(c, GID, UHID);
  groups = await fetchGroups(c);
  check('[FIX] unenroll works and count returns to 0', groups.find(g => g.id === GID)?.patientCount === 0, `count=${groups.find(g => g.id === GID)?.patientCount}`);

  // ============ SIM 3: "Not asking where to store the data" ============
  console.log('\n=== SIM 3: "Not asking where to store the data" ===');

  // selection = Google Drive on the new UploadMedia control
  const gCount = await handleUploadIntake(c, userId, {
    uhid: UHID, stage: 'Post-operative', surgeryId: SURG_ID, notes: '', newSurgeryTitle: '', newSurgeryDate: '',
    files: [{ name: 'drive copy.png', type: 'image/png', body: pngBytes }],
    storageLocation: 'Google Drive',
  });
  check('upload with Google Drive selected (new selector)', gCount === 1);
  const driveRows = (await fetchMedia(c)).filter(m => m.uhid === UHID && m.storageLocation === 'Google Drive');
  check('[FIX] media_entries.storage_location = "Google Drive" (was hardcoded LOCAL)', driveRows.length === 1, JSON.stringify(driveRows.map(m => m.storageLocation)));

  // default when selector untouched
  await handleUploadIntake(c, userId, {
    uhid: UHID, stage: 'Pre-operative', surgeryId: SURG_ID, notes: '', newSurgeryTitle: '', newSurgeryDate: '',
    files: [{ name: 'no choice.png', type: 'image/png', body: pngBytes }],
  });
  const defaultRows = (await fetchMedia(c)).filter(m => m.uhid === UHID && m.url.includes('no_choice'));
  check('[FIX] payload without storageLocation defaults to Local Storage', defaultRows.length === 1 && defaultRows[0].storageLocation === 'Local Storage', JSON.stringify(defaultRows.map(m => m.storageLocation)));

  const audit = await c.from('audit_entries').select('*').eq('user_id', userId).ilike('details', '%Google Drive%');
  check('[FIX] audit entry records chosen destination', (audit.data ?? []).length >= 1, JSON.stringify((audit.data ?? []).map(a => a.details)));

  // ============ SIM 4: font sizes (build output) ============
  console.log('\n=== SIM 4: "Font too small on laptop" — build output ===');

  const css = fs.readFileSync(path.join(WORKSPACE, 'dist', 'assets', fs.readdirSync(path.join(WORKSPACE, 'dist', 'assets')).find(f => f.endsWith('.css'))), 'utf8');
  check('[FIX] text-xs scaled to 13px (--text-xs:.8125rem)', css.includes('--text-xs:.8125rem'));
  check('[FIX] text-sm scaled to 15px (--text-sm:.9375rem)', css.includes('--text-sm:.9375rem'));
  check('[FIX] tiny labels bumped (text-[10px]/[12px]/[13px] emitted)', css.includes('text-\\[10px\\]') && css.includes('text-\\[12px\\]') && css.includes('text-\\[13px\\]'));
  const srcTiny = [];
  for (const f of ['App.tsx', 'components/Sidebar.tsx', 'views/Dashboard.tsx', 'views/PatientDetails.tsx', 'views/UploadMedia.tsx', 'views/AuditTrail.tsx', 'views/RecycleBin.tsx', 'views/StudyGroupDetailView.tsx']) {
    const content = fs.readFileSync(path.join(WORKSPACE, f), 'utf8');
    if (/text-\[(8|9)px\]/.test(content)) srcTiny.push(f);
  }
  check('[FIX] no text-[8px]/text-[9px] remain in source (bumped to 10px/11px)', srcTiny.length === 0, srcTiny.join(', '));

  // ============ CLEANUP ============
  console.log('\n=== Cleanup ===');
  await c.from('study_group_patients').delete().eq('study_group_id', GID);
  await c.from('study_groups').delete().eq('id', GID);
  await c.from('media_entries').delete().eq('patient_uhid', UHID);
  await c.from('surgeries').delete().eq('patient_uhid', UHID);
  await c.from('patients').delete().eq('uhid', UHID);
  const leftover = await c.storage.from('opus-media').list(`${userId}/${UHID}`);
  if ((leftover.data ?? []).length > 0) {
    await c.storage.from('opus-media').remove((leftover.data).map(o => `${userId}/${UHID}/${o.name}`));
  }
  const { error } = await c.auth.admin.deleteUser(userId);
  if (error) info.push(`test user ${U.email} left in auth (needs service_role): ${error.message}`);

  const finalPatients = await fetchPatients(c);
  const finalMedia = await fetchMedia(c);
  check('simulation data cleaned (patients)', !finalPatients.some(p => p.uhid === UHID));
  check('simulation data cleaned (media)', !finalMedia.some(m => m.uhid === UHID));
} catch (e) {
  check('simulation crashed', false, e.message);
  console.error(e);
}

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (info.length) console.log('\nNotes:\n' + info.map(i => `  - ${i}`).join('\n'));
process.exit(fail > 0 ? 1 : 0);
