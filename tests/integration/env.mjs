// Shared configuration for the live-Supabase integration suites.
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from the environment or from the project's .env file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadEnv() {
  const env = { ...process.env };
  const file = path.join(ROOT, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    console.log('Skipping integration suite: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).');
    process.exit(0);
  }
  return env;
}
