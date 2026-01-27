'use client';

interface LogRow {
  id: number;
  timestamp: number;
  source_pi: string;
  dest_pi: string | null;
  seq_num: number | null;
  log_type: string;
  payload: string;
}

export function LogTable({ logs }: { logs: LogRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 border-b border-gray-800">
          <tr>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Dest</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Seq</th>
            <th className="px-3 py-2">Payload</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-gray-900 hover:bg-gray-900/50">
              <td className="px-3 py-2 text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
              <td className="px-3 py-2">{log.source_pi}</td>
              <td className="px-3 py-2">{log.dest_pi ?? '-'}</td>
              <td className="px-3 py-2">{log.log_type}</td>
              <td className="px-3 py-2">{log.seq_num ?? '-'}</td>
              <td className="px-3 py-2 font-mono text-xs max-w-md truncate">{log.payload}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
