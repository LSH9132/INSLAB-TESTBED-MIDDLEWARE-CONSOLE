'use client';
import type { PiNode } from '@inslab/shared';
import { PiStatusCard } from './PiStatusCard';

export function StatusGrid({ pis }: { pis: PiNode[] }) {
  if (pis.length === 0) {
    return <p className="text-gray-500">No Pi nodes registered.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {pis.map((pi) => (
        <PiStatusCard key={pi.id} pi={pi} />
      ))}
    </div>
  );
}
