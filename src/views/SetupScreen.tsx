import React from 'react';
import { Settings } from 'lucide-react';
import { OpusLogo } from '../components/Logo';
import { useDocumentTitle } from '../lib/hooks/useDocumentTitle';

/** Shown when the Supabase environment variables are missing. */
const SetupScreen: React.FC = () => {
  useDocumentTitle('Configuration required');
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4 sm:p-6">
      <div className="card w-full max-w-lg animate-rise-in space-y-6 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <OpusLogo size="sm" />
          <span className="badge border-warn-line bg-warn-soft text-warn-ink">
            <Settings size={12} aria-hidden="true" /> Setup
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-ink">Configuration required</h1>
          <p className="text-sm leading-relaxed text-ink-2">
            OPUS needs a Supabase project. Copy <code className="rounded bg-surface-3 px-1 py-0.5">.env.example</code>{' '}
            to <code className="rounded bg-surface-3 px-1 py-0.5">.env</code>, set the values below, and restart the dev
            server.
          </p>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-inverse p-4 text-xs leading-relaxed text-teal-200">
          {`VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon-public-key>`}
        </pre>
        <p className="text-xs text-ink-3">
          Use the <strong>anon / public</strong> key only. Never put the service-role key in a VITE_ variable.
        </p>
      </div>
    </main>
  );
};

export default SetupScreen;
