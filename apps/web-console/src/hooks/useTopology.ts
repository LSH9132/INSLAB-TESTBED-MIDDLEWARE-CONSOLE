'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import type { TopologyGraph } from '@inslab/shared';

const EMPTY_GRAPH: TopologyGraph = { nodes: [], links: [], scannedAt: null };

export function useTopology() {
  const [graph, setGraph] = useState<TopologyGraph>(EMPTY_GRAPH);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchGraph = useCallback(() => {
    apiFetch<TopologyGraph>('/api/topology')
      .then(setGraph)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGraph();
    // 30초 폴링
    const interval = setInterval(fetchGraph, 30_000);
    return () => clearInterval(interval);
  }, [fetchGraph]);

  const triggerScan = useCallback(async () => {
    setScanning(true);
    try {
      await apiFetch('/api/topology/scan', { method: 'POST' });
      // 5초 후 결과 반영
      setTimeout(fetchGraph, 5000);
    } catch (err) {
      console.error('[useTopology] scan error:', err);
    } finally {
      setTimeout(() => setScanning(false), 5000);
    }
  }, [fetchGraph]);

  return { graph, loading, scanning, refetch: fetchGraph, triggerScan };
}
