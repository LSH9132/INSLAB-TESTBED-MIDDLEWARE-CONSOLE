'use client';
import { useState } from 'react';
import type { LogType } from '@inslab/shared';

interface LogFilterProps {
  onFilter: (params: { piId?: string; logType?: LogType }) => void;
}

export function LogFilter({ onFilter }: LogFilterProps) {
  const [piId, setPiId] = useState('');
  const [logType, setLogType] = useState<string>('');

  return (
    <div className="flex gap-4 mb-4">
      <input
        type="text"
        placeholder="Pi ID or hostname"
        value={piId}
        onChange={(e) => setPiId(e.target.value)}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={logType}
        onChange={(e) => setLogType(e.target.value)}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All types</option>
        <option value="ring_send">Ring Send</option>
        <option value="ring_recv">Ring Recv</option>
        <option value="system">System</option>
      </select>
      <button
        onClick={() => onFilter({ piId: piId || undefined, logType: (logType || undefined) as LogType | undefined })}
        className="bg-[#3182F6] hover:bg-[#1B64DA] text-white px-4 py-1 rounded text-sm transition-colors"
      >
        Filter
      </button>
    </div>
  );
}
