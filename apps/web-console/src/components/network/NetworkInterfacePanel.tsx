'use client';

import { useState } from 'react';
import { useNetStats } from '@/hooks/useNetStats';
import type { NetworkInterfaceStat } from '@inslab/shared';

interface Props {
  piId: string;
}

function formatBps(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} MB/s`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function Sparkline({ values, color, id }: { values: number[]; color: string; id: string }) {
  if (values.length < 2) {
    return (
      <svg viewBox="0 0 200 40" className="w-full h-10">
        <line x1="0" y1="20" x2="200" y2="20" stroke="#4b5563" strokeWidth="1" />
      </svg>
    );
  }

  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 200;
      const y = 40 - (v / max) * 36;
      return `${x},${y}`;
    })
    .join(' ');
  const area = `0,40 ${pts} 200,40`;

  return (
    <svg viewBox="0 0 200 40" className="w-full h-10 overflow-hidden">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function NetworkInterfacePanel({ piId }: Props) {
  const { latest, history, loading, error } = useNetStats({ piId, historyLimit: 60 });
  const [selectedIface, setSelectedIface] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  if (error || !latest) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
        네트워크 통계를 가져올 수 없습니다.
      </div>
    );
  }

  const interfaces = latest.interfaces;
  const active = selectedIface ?? interfaces[0]?.iface ?? null;
  const currentIface = interfaces.find((iface: NetworkInterfaceStat) => iface.iface === active);
  const rxHistory = (history[active ?? ''] ?? []).map(stat => stat.rxBps);
  const txHistory = (history[active ?? ''] ?? []).map(stat => stat.txBps);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">네트워크 인터페이스</h3>
        <span className="text-xs text-gray-400">실시간 (5s)</span>
      </div>

      <div className="flex gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
        {interfaces.map((iface: NetworkInterfaceStat) => (
          <button
            key={iface.iface}
            onClick={() => setSelectedIface(iface.iface)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              iface.iface === active
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {iface.iface}
          </button>
        ))}
      </div>

      {currentIface && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span className="text-green-500">↓</span> 수신 (RX)
                </span>
                <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">
                  {formatBps(currentIface.rxBps)}
                </span>
              </div>
              <Sparkline values={rxHistory} color="#22c55e" id={`rx-${active}`} />
              <div className="text-xs text-gray-400 dark:text-gray-500">
                누적: {formatBytes(currentIface.rxBytes)} | {Math.round(currentIface.rxPps)} pps
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span className="text-blue-500">↑</span> 송신 (TX)
                </span>
                <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {formatBps(currentIface.txBps)}
                </span>
              </div>
              <Sparkline values={txHistory} color="#3b82f6" id={`tx-${active}`} />
              <div className="text-xs text-gray-400 dark:text-gray-500">
                누적: {formatBytes(currentIface.txBytes)} | {Math.round(currentIface.txPps)} pps
              </div>
            </div>
          </div>

          {interfaces.length > 1 && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left py-1 font-medium">인터페이스</th>
                  <th className="text-right py-1 font-medium">↓ RX</th>
                  <th className="text-right py-1 font-medium">↑ TX</th>
                </tr>
              </thead>
              <tbody>
                {interfaces.map((iface: NetworkInterfaceStat) => (
                  <tr
                    key={iface.iface}
                    onClick={() => setSelectedIface(iface.iface)}
                    className={`cursor-pointer border-b border-gray-50 dark:border-gray-800/50 transition-colors ${
                      iface.iface === active
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="py-1 text-gray-700 dark:text-gray-300 font-mono">{iface.iface}</td>
                    <td className="py-1 text-right text-green-600 dark:text-green-400 font-mono">{formatBps(iface.rxBps)}</td>
                    <td className="py-1 text-right text-blue-600 dark:text-blue-400 font-mono">{formatBps(iface.txBps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
