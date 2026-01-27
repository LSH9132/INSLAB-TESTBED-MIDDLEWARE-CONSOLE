'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { PiNode } from '@inslab/shared';

export default function PiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pi, setPi] = useState<PiNode | null>(null);

  useEffect(() => {
    apiFetch<PiNode>(`/api/pis/${id}`).then(setPi).catch(console.error);
  }, [id]);

  if (!pi) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{pi.hostname}</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2 max-w-md">
        <p><span className="text-gray-400">ID:</span> {pi.id}</p>
        <p><span className="text-gray-400">Management IP:</span> {pi.ipManagement}</p>
        <p><span className="text-gray-400">Ring IP:</span> {pi.ipRing}</p>
        <p><span className="text-gray-400">SSH:</span> {pi.sshUser}@{pi.ipManagement}:{pi.sshPort}</p>
        <p><span className="text-gray-400">Status:</span> {pi.status}</p>
        <p><span className="text-gray-400">Ring Position:</span> #{pi.ringPosition ?? '-'}</p>
      </div>
      <Link href={`/terminal/${pi.id}`} className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">
        Open Terminal
      </Link>
    </div>
  );
}
