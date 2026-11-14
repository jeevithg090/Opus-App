import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { mapProfile, type ProfileRow } from '../mappers';
import type { AuthUser } from '../../types';

export interface UseSupabaseAuthReturn {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: AuthUser['role'],
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

/** Fallback identity built from auth metadata when the profile row cannot be read. */
function userFromAuth(authUser: User): AuthUser {
  const meta = (authUser.user_metadata ?? {}) as { name?: string; role?: string };
  return mapProfile({
    id: authUser.id,
    name: meta.name || authUser.email || 'User',
    role: meta.role ?? 'Surgeon',
    email: authUser.email ?? '',
  });
}

export function useSupabaseAuth(enabled = true): UseSupabaseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(enabled);

  const loadProfile = useCallback(async (authUser: User) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (error) console.warn('Could not load profile:', error.message);
    setUser(data ? mapProfile(data as ProfileRow) : userFromAuth(authUser));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const apply = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (next?.user) await loadProfile(next.user);
      else setUser(null);
      if (active) setLoading(false);
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      // INITIAL_SESSION is handled by getSession above; TOKEN_REFRESHED keeps the same user.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        setSession(next);
        return;
      }
      // Defer Supabase calls out of the auth callback to avoid client deadlocks.
      setTimeout(() => void apply(next), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [enabled, loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, name: string, role: AuthUser['role']) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return { user, session, loading, signIn, signUp, signOut };
}
