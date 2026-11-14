import React from 'react';
import { OpusLogo } from '../components/Logo';

/** Shown when the Supabase environment variables are missing. */
const SetupScreen: React.FC = () => (
  <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <div className="w-full max-w-lg space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
      <OpusLogo size="sm" className="inline-flex" />
      <h1 className="text-xl font-bold text-slate-900">Configuration required</h1>
      <p className="text-sm leading-relaxed text-slate-600">
        OPUS needs a Supabase project. Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{' '}
        <code className="rounded bg-slate-100 px-1">.env</code>, set the values below, and restart the dev server.
      </p>
      <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-teal-200">
        {`VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon-public-key>`}
      </pre>
    </div>
  </main>
);

export default SetupScreen;
