import { Router } from 'express';
import { getTopologyGraph, discoverTopology } from '../services/topology.service.js';

export const topologyRouter = Router();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

// GET /api/topology — 전체 그래프 반환
topologyRouter.get('/', (_req, res) => {
  try {
    const graph = getTopologyGraph();
    res.json(graph);
  } catch (err: unknown) {
    console.error('[topology] GET error:', err);
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

// POST /api/topology/scan — SSH 기반 자동 수집 트리거 (비동기)
topologyRouter.post('/scan', (_req, res) => {
  discoverTopology().catch(err =>
    console.error('[topology] Scan error:', err)
  );
  res.status(202).json({ message: 'Topology scan started' });
});
