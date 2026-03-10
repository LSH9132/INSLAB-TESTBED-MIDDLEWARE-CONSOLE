import { Router } from 'express';
import { getLatestNetStats, getNetStatsHistory } from '../db/net-stats.db.js';
import { getPiById } from '../services/pi-registry.service.js';

export const netStatsRouter = Router();

// GET /api/net-stats/:piId — latest snapshot per interface
netStatsRouter.get('/:piId', (req, res) => {
  const pi = getPiById(req.params.piId);
  if (!pi) return res.status(404).json({ error: 'PI not found' });

  const interfaces = getLatestNetStats(pi.id);
  const timestamp = interfaces.reduce((latest, stat) => Math.max(latest, stat.timestamp), 0);
  res.json({ piId: pi.id, timestamp, interfaces });
});

// GET /api/net-stats/:piId/history?iface=eth0&limit=60 — history points
netStatsRouter.get('/:piId/history', (req, res) => {
  const pi = getPiById(req.params.piId);
  if (!pi) return res.status(404).json({ error: 'PI not found' });

  const { iface, limit } = req.query as Record<string, string>;
  const points = getNetStatsHistory(pi.id, iface, limit ? parseInt(limit) : 60);
  res.json(points);
});
