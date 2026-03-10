'use client';

import { useNetStats } from '@/hooks/useNetStats';

interface Props {
  piId: string;
}

function formatBps(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <div className="h-6 w-16 rounded bg-gray-100 dark:bg-gray-800" />;
  }

  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 64;
    const y = 24 - (value / max) * 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 64 24" className="h-6 w-16">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function NetworkLoadCard({ piId }: Props) {
  const { latest, history, loading } = useNetStats({ piId, historyLimit: 10 });

  if (loading) {
    return (
      <div className="flex gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500 animate-pulse">
        <span>↓ --</span>
        <span>↑ --</span>
      </div>
    );
  }

  const totalRxBps = latest?.interfaces.reduce((sum, stat) => sum + stat.rxBps, 0) ?? 0;
  const totalTxBps = latest?.interfaces.reduce((sum, stat) => sum + stat.txBps, 0) ?? 0;
  const sampleLength = Math.max(0, ...Object.values(history).map(points => points.length));
  const rxSeries = Array.from({ length: sampleLength }, (_, index) =>
    Object.values(history).reduce((sum, points) => sum + (points[index]?.rxBps ?? 0), 0),
  );
  const txSeries = Array.from({ length: sampleLength }, (_, index) =>
    Object.values(history).reduce((sum, points) => sum + (points[index]?.txBps ?? 0), 0),
  );

  return (
    <div className="mt-2 space-y-2 text-xs font-mono">
      <div className="flex items-center justify-between gap-3">
        <span className="text-green-600 dark:text-green-400">↓ {formatBps(totalRxBps)}</span>
        <Sparkline values={rxSeries} color="#22c55e" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-blue-600 dark:text-blue-400">↑ {formatBps(totalTxBps)}</span>
        <Sparkline values={txSeries} color="#3b82f6" />
      </div>
    </div>
  );
}
