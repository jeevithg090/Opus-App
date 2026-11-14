import React, { useState } from 'react';
import { Eye, EyeOff, Images, Library, ShieldCheck } from 'lucide-react';
import { OpusLogo } from '../components/Logo';
import FormField from '../components/FormField';
import ThemeToggle from '../components/ThemeToggle';
import { useDocumentTitle } from '../lib/hooks/useDocumentTitle';
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

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string>>;

const HIGHLIGHTS = [
  { icon: Images, text: 'Photos, video, audio and PDFs organised by procedure and surgical stage' },
  { icon: Library, text: 'Study groups for research cohorts' },
  { icon: ShieldCheck, text: 'Private storage, per-user isolation and a full audit trail' },
];

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn, onSignUp }) => {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<AuthUser['role']>('Surgeon');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isSignIn = mode === 'signIn';

  useDocumentTitle(isSignIn ? 'Sign in' : 'Create account');

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!isSignIn && !name.trim()) errors.name = 'Enter your name.';
    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Enter your password.';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      if (isSignIn) {
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
    setMode(isSignIn ? 'signUp' : 'signIn');
    setError(null);
    setInfo(null);
    setFieldErrors({});
  };

  const clearFieldError = (key: keyof FieldErrors) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  return (
    <div className="relative flex min-h-dvh bg-canvas">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* Brand panel (tablet landscape and up) */}
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-inverse p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-accent/20 blur-3xl"
          aria-hidden="true"
        />
        <OpusLogo size="md" className="self-start" />
        <div className="relative space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">
              Operative Photo Unite &amp; Storage
            </p>
            <h2 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
              Clinical photography and research records in one secure place.
            </h2>
          </div>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-teal-300">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">
          For use by clinical teams. Access is limited to your own records.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm animate-rise-in">
          <div className="mb-8 lg:hidden">
            <OpusLogo size="md" />
            <p className="mt-4 text-sm font-medium text-ink-3">Operative Photo Unite &amp; Storage</p>
          </div>

          <h1 className="text-2xl font-bold text-ink">{isSignIn ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-1 text-sm text-ink-3">
            {isSignIn ? 'Sign in to your clinical vault.' : 'Set up access for yourself or a team member.'}
          </p>

          <div className="mt-6 space-y-4">
            {error && (
              <p role="alert" className="alert-error">
                {error}
              </p>
            )}
            {info && (
              <p role="status" className="alert-success">
                {info}
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {!isSignIn && (
                <>
                  <FormField label="Full name" error={fieldErrors.name}>
                    {(a) => (
                      <input
                        {...a}
                        type="text"
                        autoComplete="name"
                        placeholder="Dr. Jane Doe"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          clearFieldError('name');
                        }}
                        className="field"
                      />
                    )}
                  </FormField>
                  <FormField label="Role">
                    {(a) => (
                      <select
                        {...a}
                        value={role}
                        onChange={(e) => setRole(e.target.value as AuthUser['role'])}
                        className="field"
                      >
                        <option value="Surgeon">Surgeon</option>
                        <option value="Fellow">Fellow</option>
                        <option value="Researcher">Researcher</option>
                      </select>
                    )}
                  </FormField>
                </>
              )}
              <FormField label="Email" error={fieldErrors.email}>
                {(a) => (
                  <input
                    {...a}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@hospital.org"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    className="field"
                  />
                )}
              </FormField>
              <FormField
                label="Password"
                error={fieldErrors.password}
                hint={isSignIn ? undefined : 'At least 6 characters.'}
              >
                {(a) => (
                  <div className="relative">
                    <input
                      {...a}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignIn ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFieldError('password');
                      }}
                      className="field pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 hover:text-ink"
                    >
                      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                )}
              </FormField>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Please wait…' : isSignIn ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-ink-3">
              {isSignIn ? 'New to OPUS?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="rounded font-semibold text-brand-ink underline-offset-4 hover:underline"
              >
                {isSignIn ? 'Create an account' : 'Sign in instead'}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthScreen;
