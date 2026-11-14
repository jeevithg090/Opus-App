/**
 * Runtime configuration read from Vite environment variables.
 * Only `VITE_`-prefixed variables are exposed to the browser bundle.
 */
export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function readConfig(env: Record<string, string | undefined>): AppConfig | null {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

export const config = readConfig(import.meta.env as Record<string, string | undefined>);
export const isConfigured = config !== null;
