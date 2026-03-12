'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { LogTable } from '@/components/logs/LogTable';
import { LogFilter } from '@/components/logs/LogFilter';
import type { LogType } from '@inslab/shared';
import type { LogRow } from '@/components/logs/LogTable';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState<{ piId?: string; logType?: LogType }>({});

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.piId) params.set('piId', filter.piId);
    if (filter.logType) params.set('logType', filter.logType);
    params.set('limit', '200');
    apiFetch<LogRow[]>(`/api/logs?${params}`).then(setLogs).catch(console.error);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#191F28] dark:text-gray-50 mb-2">로그</h1>
          <p className="text-[#6B7684] dark:text-gray-400 text-[15px]">시스템 로그를 확인하세요</p>
        </div>
        <button
          onClick={load}
          className="bg-[#3182F6] hover:bg-[#1B64DA] text-white px-5 py-2.5 rounded-xl text-[14px] font-bold transition-colors"
        >
          새로고침
        </button>
      </div>
      <LogFilter onFilter={setFilter} />
      <LogTable logs={logs} />
    </div>
  );
}
