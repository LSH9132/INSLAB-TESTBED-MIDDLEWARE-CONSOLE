import { Router } from 'express';
import { getTopologyGraph, discoverTopology } from '../services/topology.service.js';

export const topologyRouter = Router();

// GET /api/topology — 전체 그래프 반환
topologyRouter.get('/', (_req, res) => {
  try {
    const graph = getTopologyGraph();
    res.json(graph);
  } catch (err: any) {
    console.error('[topology] GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/topology/scan — SSH 기반 자동 수집 트리거 (비동기)
topologyRouter.post('/scan', (_req, res) => {
  discoverTopology().catch(err =>
    console.error('[topology] Scan error:', err)
  );
  res.status(202).json({ message: 'Topology scan started' });
});
