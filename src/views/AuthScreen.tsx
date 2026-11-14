import React, { useState } from 'react';
import { OpusLogo } from '../components/Logo';
import type { AuthUser } from '../types';

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp: (
    email: string,
    password: string,
    name: string,
    role: AuthUser['role'],
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
}

const inputClass =
  'w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all';

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn, onSignUp }) => {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AuthUser['role']>('Surgeon');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        const result = await onSignIn(email.trim(), password);
        if (result.error) setError(result.error);
      } else {
        const result = await onSignUp(email.trim(), password, name.trim(), role);
        if (result.error) {
          setError(result.error);
        } else if (result.needsConfirmation) {
          setMode('signIn');
          setInfo('Account created. Check your email to confirm it, then sign in.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signIn' ? 'signUp' : 'signIn');
    setError(null);
    setInfo(null);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-50 via-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-10">
          <div className="mb-6 inline-block rounded-[2.5rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <OpusLogo size="md" />
          </div>
          <h1 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500">
            Operative Photo Unite &amp; Storage
          </h1>
        </div>
        <div className="space-y-6 rounded-[2.5rem] border border-white bg-white/90 p-8 shadow-2xl backdrop-blur-3xl sm:p-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
            {mode === 'signIn' ? 'Sign in to your vault' : 'Create an account'}
          </h2>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-600"
            >
              {error}
            </p>
          )}
          {info && (
            <p
              role="status"
              className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700"
            >
              {info}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {mode === 'signUp' && (
              <>
                <label className="block">
                  <span className="sr-only">Full name</span>
                  <input
                    type="text"
                    placeholder="Full name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Role</span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AuthUser['role'])}
                    className={inputClass}
                  >
                    <option value="Surgeon">Surgeon</option>
                    <option value="Fellow">Fellow</option>
                    <option value="Researcher">Researcher</option>
                  </select>
                </label>
              </>
            )}
            <label className="block">
              <span className="sr-only">Email</span>
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="sr-only">Password</span>
              <input
                type="password"
                placeholder="Password"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[1.8rem] bg-slate-900 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition-all active:scale-95 disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : mode === 'signIn' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <button
            type="button"
            onClick={toggleMode}
            className="w-full text-[12px] font-black uppercase tracking-widest text-teal-700 transition-colors hover:text-teal-800"
          >
            {mode === 'signIn' ? 'Create an account' : 'Sign in instead'}
          </button>
        </div>
      </div>
    </main>
  );
};

export default AuthScreen;
