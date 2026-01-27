'use client';
import { StatusGrid } from '@/components/dashboard/StatusGrid';
import { usePiStatus } from '@/hooks/usePiStatus';

export default function DashboardPage() {
  const pis = usePiStatus();

  const online = pis.filter((p) => p.status === 'online').length;
  const total = pis.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <span className="text-sm text-gray-400">
          {online}/{total} online
        </span>
      </div>
      <StatusGrid pis={pis} />
    </div>
  );
}
