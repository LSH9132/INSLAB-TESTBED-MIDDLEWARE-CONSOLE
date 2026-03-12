'use client';

export interface LogRow {
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden toss-shadow transition-colors duration-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-[#4E5968] dark:text-gray-400 bg-[#F9FAFB] dark:bg-gray-900 border-b border-[#E5E8EB] dark:border-gray-700">
            <tr>
              <th className="px-6 py-3">Time</th>
              <th className="px-6 py-3">Source</th>
              <th className="px-6 py-3">Dest</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Seq</th>
              <th className="px-6 py-3">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[#F9FAFB] dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 text-[#8B95A1] dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4 font-medium text-[#191F28] dark:text-gray-100">{log.source_pi}</td>
                <td className="px-6 py-4 text-[#4E5968] dark:text-gray-300">{log.dest_pi ?? '-'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium 
                    ${log.log_type === 'system' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                      log.log_type.includes('send') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                    {log.log_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#4E5968] dark:text-gray-300">{log.seq_num ?? '-'}</td>
                <td className="px-6 py-4 font-mono text-xs max-w-md truncate text-[#333D4B] dark:text-gray-300">{log.payload}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
