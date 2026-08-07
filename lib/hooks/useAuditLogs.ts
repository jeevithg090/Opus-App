import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { mapAuditEntry } from '../mappers';
import type { AuditEntry } from '../../types';

interface UseAuditLogsReturn {
  logs: AuditEntry[];
  loading: boolean;
  addEntry: (userId: string, userName: string, action: string, targetId: string, details: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAuditLogs(): UseAuditLogsReturn {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_entries')
      .select('*')
      .order('timestamp', { ascending: false });

    setLogs((data ?? []).map(mapAuditEntry));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addEntry = async (userId: string, userName: string, action: string, targetId: string, details: string) => {
    await supabase.from('audit_entries').insert({
      user_id: userId,
      user_name: userName,
      action,
      target_id: targetId,
      details,
      timestamp: new Date().toISOString(),
    });
    await fetchLogs();
  };

  return { logs, loading, addEntry, refetch: fetchLogs };
}
