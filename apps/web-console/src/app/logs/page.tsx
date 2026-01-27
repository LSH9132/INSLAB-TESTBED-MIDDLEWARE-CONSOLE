'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { LogTable } from '@/components/logs/LogTable';
import { LogFilter } from '@/components/logs/LogFilter';
import type { LogType } from '@inslab/shared';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ piId?: string; logType?: LogType }>({});

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.piId) params.set('piId', filter.piId);
    if (filter.logType) params.set('logType', filter.logType);
    params.set('limit', '200');
    apiFetch<any[]>(`/api/logs?${params}`).then(setLogs).catch(console.error);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Logs</h2>
        <button onClick={load} className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">Refresh</button>
      </div>
      <LogFilter onFilter={setFilter} />
      <LogTable logs={logs} />
    </div>
  );
}
