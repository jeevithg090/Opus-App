import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { mapAuditEntry, type AuditRow } from '../mappers';
import type { AuditEntry, AuthUser } from '../../types';

export type AuditAction =
  | 'Patient Creation'
  | 'Patient Correction'
  | 'Intake Upload'
  | 'Record Archival'
  | 'Record Restore'
  | 'Permanent Scrub'
  | 'Vault Sync'
  | 'Group Creation'
  | 'Group Update'
  | 'Group Enrollment'
  | 'Group Removal';

export interface UseAuditLogsReturn {
  logs: AuditEntry[];
  loading: boolean;
  error: string | null;
  /** Records an action. Never throws: audit failures are logged, not surfaced. */
  record: (action: AuditAction, targetId: string, details: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAuditLogs(user: AuthUser | null): UseAuditLogsReturn {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  const fetchLogs = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('audit_entries')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);
    setError(fetchError ? fetchError.message : null);
    if (!fetchError) setLogs(((data ?? []) as AuditRow[]).map(mapAuditEntry));
    setLoading(false);
  }, []);

  // State is scoped to the signed-in user; the owning component remounts on sign-out.
  useEffect(() => {
    // setState only runs after the awaited request resolves, not synchronously in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId) void fetchLogs();
  }, [userId, fetchLogs]);

  const record = async (action: AuditAction, targetId: string, details: string) => {
    if (!user) return;
    const { error: insertError } = await supabase.from('audit_entries').insert({
      user_id: user.id,
      user_name: user.name,
      action,
      target_id: targetId,
      details,
      timestamp: new Date().toISOString(),
    });
    if (insertError) {
      console.warn('Audit entry was not recorded:', insertError.message);
      return;
    }
    await fetchLogs();
  };

  return { logs, loading, error, record, refetch: fetchLogs };
}
