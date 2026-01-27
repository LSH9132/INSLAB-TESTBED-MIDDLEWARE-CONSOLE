'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { RingGraph } from '@/components/topology/RingGraph';
import type { RingTopology } from '@inslab/shared';

export default function TopologyPage() {
  const [topology, setTopology] = useState<RingTopology | null>(null);

  useEffect(() => {
    apiFetch<RingTopology>('/api/topology').then(setTopology).catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Ring Topology</h2>
      {topology ? (
        <RingGraph topology={topology} />
      ) : (
        <p className="text-gray-500">Loading topology...</p>
      )}
    </div>
  );
}
