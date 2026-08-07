<div align="center">

# 🏥 OPUS — Operative Photo Unite and Storage

**Clinical photography and research management for surgeons**

Track patient media across surgical stages, manage longitudinal study groups, and keep an immutable audit trail — all isolated per user.

![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript_5.8-3178C6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?logo=vite&logoColor=fff)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=fff)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff)
![Tests](https://img.shields.io/badge/tests-86%2F86%20passing-22c55e)

</div>

---

## 📖 Overview

OPUS is a specialized web application built for surgeons and researchers to:

- Maintain a **patient registry** with full clinical details (UHID, diagnosis, lead surgeon, procedure history)
- **Upload surgical media** (photos, videos, audio memos, PDF findings) organized by surgical stage
- Group patients into **longitudinal study cohorts** for research
- Track every interaction through an **immutable audit trail**
- Keep all data **isolated per user** via row-level security

Each patient's media is organized by **surgical stage** — *Pre-operative, Intra-operative, Post-operative* — with automatic **POD (Post-Operative Day)** calculation.

---

## ✨ Features

### Authentication
- Email/password sign-up and sign-in (Supabase Auth)
- Auto-created user profile with role (`Surgeon`, `Fellow`, `Researcher`)
- Session persistence and sign-out

### Patient Registry
- Add patients with UHID, name, and diagnosis (auto-creates a "Primary Surgery" record when a date is provided)
- Search by name or UHID (case-insensitive)
- Edit records via the "Vault Correction" modal
- **Soft delete** (moved to Archive) and **hard delete** (permanent purge)
- POD badge computed from the most recent surgery date

### Archive (Recycle Bin)
- 30-day retention countdown per record
- Restore to active registry
- Purge permanently (cascades to surgeries, media, and study-group memberships)

### Media Intake
- Upload **real files** from disk: images, videos, audio, PDFs
- Files stored in the Supabase **`opus-media`** storage bucket (50 MB limit), one entry per file with the real public URL
- Media organized by surgery + stage; filterable gallery with full-screen viewer
- Download/export prompt (JPG/PNG/PDF/RAW)
- Cloud sync tracking: each entry flagged `Local Storage` or `Google Drive` (location metadata)

### Study Groups (Research Units)
- Create/update cohorts with description
- Enroll/unenroll patients, live member count
- Group membership reflected on dashboard patient cards

### Audit Trail
- Immutable log of every clinical action (11 action types: patient creation/correction, intake upload, archival, restore, purge, sync, group operations…)
- Filterable by user, action, target, or details

### Mobile-Ready UI
- Bottom dock navigation on phones, sidebar on desktop
- Touch-accessible media controls
- Safe-area aware (notch support), keyboard-safe modals

---

## 🧱 Tech Stack

| Layer | Technology | Role |
|---|---|---|
| UI | React 19 + TypeScript | Components & state |
| Build | Vite 6 | Dev server & bundling |
| Styling | Tailwind CSS 4 (+ lucide-react icons) | Styling |
| Backend | Supabase Postgres | Data + RLS |
| Auth | Supabase Auth | Email/password |
| Storage | Supabase Storage (`opus-media`) | Media files |
| Tests | Node integration suite (`tests/deep-test.mjs`) | End-to-end backend checks |

---

## 🏗 Architecture

```
┌──────────────────────┐        ┌──────────────────────────┐
│   React SPA (Vite)   │  HTTP  │       Supabase          │
│                      │ ─────► │  ┌────────────────────┐ │
│  App.tsx             │        │  │ Auth (email/pass)  │ │
│  views/  (7 views)   │        │  ├────────────────────┤ │
│  lib/hooks/ (5 hooks)│        │  │ Postgres + RLS     │ │
│  lib/mappers.ts      │        │  │  (7 tables)        │ │
│  lib/supabase.ts     │        │  ├────────────────────┤ │
│                      │        │  │ Storage: opus-media│ │
└──────────────────────┘        └──────────────────────┘
```

### Project structure

```
.
├── App.tsx                     # Root: routing, modals, security checkpoint
├── components/
│   ├── Logo.tsx
│   └── Sidebar.tsx             # Desktop sidebar + mobile bottom dock
├── views/
│   ├── Dashboard.tsx           # Registry, search, recent activity, add patient
│   ├── PatientDetails.tsx      # Media gallery, stages, sync, viewer
│   ├── UploadMedia.tsx         # Intake form (files + notes)
│   ├── StudyGroupDetailView.tsx# Cohort members + enrollment
│   ├── RecycleBin.tsx          # Archive (30-day retention)
│   └── AuditTrail.tsx          # Immutable log + filter
├── lib/
│   ├── supabase.ts             # Supabase client
│   ├── mappers.ts              # DB → domain mappers
│   └── hooks/                  # useSupabaseAuth, usePatients, useMedia,
│                               # useStudyGroups, useSurgeries, useAuditLogs
├── supabase/migrations/        # Versioned SQL migrations
├── tests/deep-test.mjs         # 86-check integration suite
└── types.ts                    # Domain types
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**
- A **Supabase project** (free tier is fine) — [create one here](https://supabase.com)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root (it is gitignored — never commit it):

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

> Find both in Supabase Dashboard → **Project Settings → API**. Use the **anon/public** key — the service role key must never be exposed in the client.

### 3. Set up the database

The schema lives in `supabase/migrations/`. With the Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

This applies all migrations — schema, triggers, RLS policies, and the `opus-media` storage bucket.

### 4. Run the app

```bash
npm run dev
```

Dev server runs on **http://localhost:3000** (host `0.0.0.0`, so it's reachable from your phone on the same LAN for mobile testing).

---

## 📜 Database Migrations

| Migration | Purpose |
|---|---|
| `20260805135445_initial_schema.sql` | Core tables, profile trigger, RLS policies |
| `20260805140329_fix_id_types.sql` | Surgeries/media IDs → text (client-generated IDs) |
| `20260805151524_fix_profile_trigger.sql` | Role/name from sign-up metadata |
| `20260805160758_create_storage_bucket.sql` | (placeholder — superseded) |
| `20260807000000_fix_study_group_patients_rls.sql` | **Security fix:** study-group membership now verifies patient ownership too |
| `20260807100000_create_opus_media_bucket.sql` | Creates `opus-media` bucket + storage RLS |

---

## ⚙️ Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm run test:deep` | Run the 86-check integration suite |

---

## 🧪 Testing

```bash
npm run test:deep
```

The suite is a Node integration test against your **live Supabase project** (it uses the credentials in `.env`). It creates two throwaway users and validates the real query paths the app uses:

| Phase | Coverage |
|---|---|
| P1 | Auth: signup, profile trigger, roles, sign-in, wrong password, sign-out, session persistence |
| P1b | RLS isolation between users + unauthenticated access denial |
| P2 | Patients: create/auto-surgery, search, duplicate UHID, edit, soft-delete → archive → restore, hard-delete cascade, POD & retention math |
| P3 | Study groups: create/update/enroll/unenroll, count + membership reflection, cross-user enrollment blocked |
| P4 | Media: all 4 types, storage round-trip (upload → public URL → HTTP 200), CHECK/FK constraints, dashboard feed + PatientDetails filters, cloud sync, cascade behavior, upload validation logic |
| P5 | Audit: all 11 actions, read-back, search filter, sort, RLS |
| P6 | Cleanup of test data |

**Cleanup caveats** (by design): test auth users can't be deleted without a service-role key, and `audit_entries` has no DELETE policy (immutable). Leftover test users/audit rows may accumulate across runs.

---

## 🔐 Security Model

All tables enable **Row-Level Security**; every row carries `user_id` (defaulting to `auth.uid()`).

| Table | Policy |
|---|---|
| `profiles` | Users manage only their own profile |
| `patients` | Users manage only their own patients |
| `surgeries` | Users manage only their own surgeries |
| `media_entries` | Users manage only their own media |
| `study_groups` | Users manage only their own groups |
| `study_group_patients` | Membership requires **both** group *and* patient ownership |
| `audit_entries` | Read/insert own entries only; no update/delete (immutable) |

**Storage:** the `opus-media` bucket is public-read (for rendering); authenticated users can only upload/manage objects under their own `{user-id}/` folder.

---

## 🗄 Data Model

- **profiles** — extends `auth.users`; `name`, `role`, `email`
- **patients** — `uhid` (PK), `name`, `age_years/months`, `gender`, `diagnosis`, `primary_surgeon`, `date_of_surgery`, `deleted_at` (soft delete)
- **surgeries** — `title`, `date`, `notes`, `ot_notes`, `finding_url`; belongs to a patient
- **media_entries** — `url`, `thumbnail_url`, `stage` (3-stage enum), `type` (image/video/audio/pdf), `tags`, `storage_location`; optional `surgery_id`
- **study_groups** — `name`, `description`, `drive_folder_id`, `last_sync`
- **study_group_patients** — many-to-many join (cascades on both sides)
- **audit_entries** — `user_id`, `user_name`, `action`, `target_id`, `details`, `timestamp`

---

## 🔧 Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Adding a patient silently fails | Was fixed — empty `dateOfSurgery` is now coerced to `null` (DATE columns reject `''`) |
| Uploaded image shows a stock photo | Was fixed — uploads previously used a hardcoded placeholder URL; files now go to `opus-media` storage. Re-run `supabase db push` if on an old checkout |
| New uploads don't appear | There's no live subscription yet — **refresh the page** after uploading |
| Media upload fails with RLS error | Ensure the storage migration was applied and you're logged in |

---

## 📦 Deployment

```bash
npm run build
```

Then deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the hosting provider.

---

## ⚠️ Known Limitations

- No UI to delete a media entry or a surgery (schema supports it)
- No real Google Drive sync — `storage_location` is tracking metadata only
- `recharts` and `vite-plugin-pwa` are listed in `package.json` but not wired up yet
- No real-time subscriptions — data updates on refetch/reload
- `audit_entries` cannot be deleted via the API (intentional immutability)

---

## 📝 License

Private project — all rights reserved.
