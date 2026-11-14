# OPUS — Operative Photo Unite and Storage

**Clinical photography and research management for surgeons.**

OPUS is a web app for surgeons and clinical researchers to keep patient photographs, videos, audio memos and PDF documents organised by procedure and surgical stage, group patients into study cohorts, and keep an append-only audit trail of every change. Each user's data is isolated in the database by row-level security, and media lives in a private storage bucket that is only reachable through short-lived signed URLs.

---

## Features

- **Patient registry** — register patients with UHID, demographics, lead surgeon and diagnosis. Adding a surgery date creates a "Primary Surgery" record automatically. Search by name or UHID.
- **Post-operative day (POD)** — computed from the most recent procedure using calendar days in the user's time zone.
- **Media intake** — upload images, video, audio and PDFs (up to 50 MB each) against an existing or new procedure and a surgical stage (pre-, intra- or post-operative). Notes entered at intake are appended to the procedure's operative log with the stage and date.
- **Patient record view** — gallery filtered by procedure and stage with per-stage counts, a full-screen viewer for every media type (including inline PDF), links to open/download originals, and the procedure's operative notes.
- **Study groups** — create cohorts, enrol and remove patients, see member counts.
- **Archive** — soft-delete patients into an archive with a 30-day retention countdown, restore them, or permanently delete them (typing the UHID is required to confirm).
- **Audit trail** — every create/update/archive/restore/purge/enrol action is logged with user and timestamp; the log is searchable and cannot be edited or deleted through the API.
- **Archive tracking** — tag media as "Local Vault" or "Google Drive" to record where copies have been archived. This is metadata only; OPUS does not talk to Google Drive.
- **Responsive, accessible UI** — sidebar on desktop and a bottom dock on phones; labelled dialogs that close with Escape, keyboard-reachable controls, a skip link, and reduced-motion support.

## Tech stack

| Layer   | Technology                                                      |
| ------- | --------------------------------------------------------------- |
| UI      | React 19, TypeScript 5.8 (strict), Tailwind CSS 4, lucide-react |
| Build   | Vite 6                                                          |
| Backend | Supabase — Postgres with row-level security, Auth, Storage      |
| Quality | ESLint 9 (typescript-eslint, react-hooks), Prettier 3           |
| Tests   | Vitest 5, Testing Library, jsdom; optional live-Supabase suite  |
| CI      | GitHub Actions                                                  |

## Architecture

```
┌───────────────────────────── Browser (React SPA) ─────────────────────────────┐
│                                                                               │
│  views/        Dashboard · PatientDetails · UploadMedia · StudyGroups ·        │
│                AuditTrail · RecycleBin · AuthScreen · SetupScreen             │
│  components/   Sidebar · Modal · ConfirmActionModal · PatientEditModal · …    │
│                                                                               │
│  lib/hooks/    useSupabaseAuth · usePatients · useMedia · useStudyGroups ·     │
│                useAuditLogs   (data fetching + mutations, typed errors)       │
│  lib/          clinical.ts (pure domain logic: POD, retention, search, paths)  │
│                intake.ts   (intake workflow with rollback, dependency-injected)│
│                storage.ts  (uploads + batch signed URLs)                       │
│                mappers.ts  (snake_case rows ⇄ domain types)                    │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        │ supabase-js (anon key + user JWT)
┌───────────────────────────────────────▼───────────────────────────────────────┐
│ Supabase                                                                       │
│  Auth ─ email/password; trigger creates a `profiles` row on sign-up            │
│  Postgres ─ profiles · patients · surgeries · media_entries · study_groups ·   │
│             study_group_patients · audit_entries   (RLS on every table)        │
│  Storage ─ private bucket `opus-media`, objects under `{user_id}/{uhid}/…`     │
└────────────────────────────────────────────────────────────────────────────────┘
```

- The app talks to Supabase directly from the browser; all authorisation is enforced in the database by RLS policies, not in client code.
- Media rows store the storage **object key**. When media is loaded, the keys are exchanged for signed URLs (valid for one hour) in a single batch request. Rows created by older versions that stored a public URL are handled transparently.
- Views are lazy-loaded, and React and supabase-js are split into separate vendor chunks.

## Getting started

### Prerequisites

- Node.js 20 or newer (CI uses Node 22)
- A Supabase project (the free tier is enough) and, for applying migrations, the [Supabase CLI](https://supabase.com/docs/guides/cli)

### 1. Install

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable                 | Required | Description                                            |
| ------------------------ | -------- | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | yes      | Project URL, e.g. `https://<project-ref>.supabase.co`  |
| `VITE_SUPABASE_ANON_KEY` | yes      | The **anon / public** API key (Project Settings → API) |

Both values are embedded in the browser bundle. Never use the service-role key here. If either variable is missing the app shows a configuration screen instead of failing.

### 3. Set up the database

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

This applies everything in `supabase/migrations/`: tables, the profile trigger, RLS policies, and the private `opus-media` storage bucket with per-user folder policies.

### 4. Run

```bash
npm run dev
```

The dev server listens on <http://localhost:3000> and on your LAN address, so you can open it from a phone on the same network.

## Scripts

| Command                    | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `npm run dev`              | Start the Vite dev server on port 3000               |
| `npm run build`            | Type-check and build for production into `dist/`     |
| `npm run preview`          | Serve the production build locally (port 4173)       |
| `npm run lint`             | ESLint                                               |
| `npm run typecheck`        | TypeScript (`tsc --noEmit`)                          |
| `npm run format`           | Format with Prettier (`format:check` to verify only) |
| `npm test`                 | Unit and component tests (Vitest)                    |
| `npm run test:coverage`    | Unit tests with a coverage report for `src/lib`      |
| `npm run test:integration` | Live suite against your Supabase project (see below) |

## Testing

**Unit and component tests** (`tests/unit/`) run without a backend and cover the domain logic and key UI flows:

- `clinical.test.ts` — POD and retention arithmetic (including time-zone and DST edge cases), MIME detection, storage-path building and parsing, search and audit filtering, recent-activity ordering
- `intake.test.ts` — the intake workflow: new vs existing procedure, notes appended to the operative log, validation, and cleanup of uploaded files when a later step fails
- `storage.test.ts` — batch URL signing and upload paths with a mocked Supabase client
- `mappers.test.ts` — row mapping, role guarding, patient-draft conversion, configuration parsing
- `components.test.tsx` — the UHID-typed confirmation for permanent deletion, registry search, the add-patient form and its error state, and intake form validation

**Integration suite** (`tests/integration/deep-test.mjs`) runs against a real Supabase project using the credentials in `.env`. It creates two throwaway users and checks auth, RLS isolation between users, CRUD paths, constraints, private storage and the audit log. It exits without doing anything if the variables are not set.

> The integration suite writes to the project it is pointed at, and test users and audit rows cannot be deleted with the anon key. Run it against a development project only.

## Deployment

OPUS builds to static files, so any static host works (Vercel, Netlify, Cloudflare Pages, S3 + CloudFront, …):

1. Apply the migrations to your production Supabase project (`supabase db push`).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's build environment.
3. Build command `npm run build`, output directory `dist`.
4. In Supabase Auth settings, add the deployed URL to the allowed site/redirect URLs so confirmation emails link back correctly.

The app has no client-side routes, so no SPA rewrite rules are needed.

## Security model

| Table                  | Policy                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `profiles`             | A user can read and write only their own profile                                           |
| `patients`             | Rows are owned by `user_id` (defaults to `auth.uid()`)                                     |
| `surgeries`            | Owned rows; new rows must reference one of the caller's patients                           |
| `media_entries`        | Owned rows; new rows must reference the caller's patient and (if set) the caller's surgery |
| `study_groups`         | Owned rows                                                                                 |
| `study_group_patients` | Both the group and the patient must belong to the caller                                   |
| `audit_entries`        | Read and insert own entries only — no update or delete                                     |

Storage: `opus-media` is a **private** bucket. Users can only read and write objects in their own `{user_id}/` folder, and the app reads media through signed URLs that expire after one hour.

## Project structure

```
.
├── index.html                  # HTML shell and page metadata
├── src/
│   ├── main.tsx                # Entry point
│   ├── App.tsx                 # Config/auth gate, workspace state, modals
│   ├── types.ts                # Domain types
│   ├── index.css               # Tailwind theme and global styles
│   ├── components/             # Sidebar, Modal, confirmation/edit dialogs, Notice, Spinner
│   ├── views/                  # One component per screen
│   └── lib/
│       ├── clinical.ts         # Pure domain helpers
│       ├── intake.ts           # Intake workflow
│       ├── storage.ts          # Storage uploads and signed URLs
│       ├── surgeries.ts        # Surgery writes
│       ├── mappers.ts          # DB row ⇄ domain mapping
│       ├── patientDraft.ts     # New-patient form model
│       ├── env.ts / supabase.ts# Configuration and client
│       └── hooks/              # Data hooks per resource
├── supabase/migrations/        # Versioned SQL schema, RLS and storage policies
├── tests/
│   ├── unit/                   # Vitest unit and component tests
│   └── integration/            # Live Supabase suite
└── .github/workflows/ci.yml    # Format, lint, type-check, test, build
```

## Database migrations

| Migration                                         | Purpose                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `20260805135445_initial_schema.sql`               | Core tables, profile trigger, RLS                                              |
| `20260805140329_fix_id_types.sql`                 | Surgery and media IDs become client-generated text                             |
| `20260805151524_fix_profile_trigger.sql`          | Name and role taken from sign-up metadata                                      |
| `20260805160758_create_storage_bucket.sql`        | Intentionally empty (kept for migration history)                               |
| `20260807000000_fix_study_group_patients_rls.sql` | Group membership requires owning both the group and the patient                |
| `20260807100000_create_opus_media_bucket.sql`     | `opus-media` bucket and per-user folder policies                               |
| `20261114000000_harden_security.sql`              | Private bucket, ownership checks on child rows, trigger `search_path`, indexes |

## Known limitations

- A UHID is a global primary key, so two different users cannot register the same UHID. Making patients unique per user would need a schema change.
- There is no UI yet for deleting a single media entry or procedure (the schema supports it).
- Archived records are not purged automatically after 30 days; the countdown is informational until a scheduled job is added.
- Data refreshes after each action and on reload; there are no real-time subscriptions.
- "Google Drive" is a tracking label only; files always live in Supabase Storage.
