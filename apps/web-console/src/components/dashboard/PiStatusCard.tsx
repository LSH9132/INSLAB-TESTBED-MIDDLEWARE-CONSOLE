'use client';
import Link from 'next/link';
import type { PiNode } from '@inslab/shared';

const statusColor: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-red-500',
  unknown: 'bg-gray-500',
};

export function PiStatusCard({ pi }: { pi: PiNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{pi.hostname}</h3>
        <span className={`w-3 h-3 rounded-full ${statusColor[pi.status]}`} />
      </div>
      <p className="text-xs text-gray-400 mb-1">Management: {pi.ipManagement}</p>
      <p className="text-xs text-gray-400 mb-1">Ring: {pi.ipRing}</p>
      <p className="text-xs text-gray-400 mb-3">Position: #{pi.ringPosition ?? '-'}</p>
      <div className="flex gap-2">
        <Link href={`/terminal/${pi.id}`} className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">
          Terminal
        </Link>
        <Link href={`/pis/${pi.id}`} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
          Detail
        </Link>
      </div>
    </div>
  );
}
