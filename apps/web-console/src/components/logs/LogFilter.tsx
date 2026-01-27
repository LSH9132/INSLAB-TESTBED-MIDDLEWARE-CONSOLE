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
        className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
      />
      <select
        value={logType}
        onChange={(e) => setLogType(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
      >
        <option value="">All types</option>
        <option value="ring_send">Ring Send</option>
        <option value="ring_recv">Ring Recv</option>
        <option value="system">System</option>
      </select>
      <button
        onClick={() => onFilter({ piId: piId || undefined, logType: (logType || undefined) as LogType | undefined })}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded text-sm"
      >
        Filter
      </button>
    </div>
  );
}
