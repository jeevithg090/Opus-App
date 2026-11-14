import { createClient } from '@supabase/supabase-js';
import { config } from './env';

/** Name of the private storage bucket that holds clinical media. */
export const MEDIA_BUCKET = 'opus-media';

/**
 * Shared Supabase client. When the app is not configured a placeholder client is
 * created so imports never throw; `App` renders a setup screen instead of making calls.
 */
export const supabase = createClient(
  config?.supabaseUrl ?? 'http://localhost:54321',
  config?.supabaseAnonKey ?? 'not-configured',
);
