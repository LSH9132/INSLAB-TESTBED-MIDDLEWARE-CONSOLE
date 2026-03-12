'use client';

import { useNetStats } from '@/hooks/useNetStats';

interface Props {
  piId: string;
  piName: string;
}

function formatBps(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <div className="h-6 w-16 rounded bg-gray-100 dark:bg-gray-800 transition-opacity duration-300" />;
  }

  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 64;
      const y = 24 - (value / max) * 20;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 64 24" className="h-6 w-16 transition-opacity duration-300">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function NetworkLoadCard({ piId, piName }: Props) {
  const { latest, history, loading, error } = useNetStats({ piId, historyLimit: 10 });

  if (loading) {
    return (
      <div className="flex gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500 animate-pulse">
        <span>↓ --</span>
        <span>↑ --</span>
      </div>
    );
  }

  if (error || !latest) {
    return (
      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        수집 없음
      </div>
    );
  }

  const totalRxBps =
    latest.interfaces.reduce((sum: number, stat: { rxBps: number }) => sum + stat.rxBps, 0);
  const totalTxBps =
    latest.interfaces.reduce((sum: number, stat: { txBps: number }) => sum + stat.txBps, 0);

  const sampleLength = Math.max(0, ...Object.values(history).map(points => points.length));
  const rxSeries = Array.from({ length: sampleLength }, (_, index) =>
    Object.values(history).reduce((sum, points) => sum + (points[index]?.rxBps ?? 0), 0),
  );
  const txSeries = Array.from({ length: sampleLength }, (_, index) =>
    Object.values(history).reduce((sum, points) => sum + (points[index]?.txBps ?? 0), 0),
  );

  return (
    <div className="mt-2 space-y-2 text-xs font-mono" title={`${piName} network load`}>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-[92px] text-green-600 dark:text-green-400 tabular-nums transition-all duration-300">
          ↓ {formatBps(totalRxBps)}
        </span>
        <Sparkline values={rxSeries} color="#22c55e" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-[92px] text-blue-600 dark:text-blue-400 tabular-nums transition-all duration-300">
          ↑ {formatBps(totalTxBps)}
        </span>
        <Sparkline values={txSeries} color="#3b82f6" />
      </div>
    </div>
  );
}
