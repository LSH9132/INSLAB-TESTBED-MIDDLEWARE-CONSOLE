import { Router } from 'express';
import { getPiById } from '../services/pi-registry.service.js';
import type { NetworkStatSnapshot } from '@inslab/shared';
import { getNetStatsSettings } from '../services/app-settings.service.js';
import { config } from '../config.js';

export const netStatsRouter = Router();

function isFreshSnapshot(snapshot: NetworkStatSnapshot): boolean {
  const freshnessTimestamp = snapshot.receivedAt ?? snapshot.timestamp;
  const snapshotMs = freshnessTimestamp < 1_000_000_000_000 ? freshnessTimestamp * 1000 : freshnessTimestamp;
  return Date.now() - snapshotMs <= getNetStatsSettings().freshnessSec * 1000;
}

netStatsRouter.get('/:piId', async (req, res) => {
  const pi = getPiById(req.params.piId);
  if (!pi) return res.status(404).json({ error: 'PI not found' });

  try {
    const response = await fetch(`${config.logServerUrl}/api/net-metrics/${pi.id}/latest`);
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const snapshot = data as NetworkStatSnapshot;
    if (!snapshot.interfaces?.length || !isFreshSnapshot(snapshot)) {
      return res.status(404).json({ error: 'Network stats unavailable' });
    }

    res.json(snapshot);
  } catch {
    res.status(502).json({ error: 'Log server unavailable' });
  }
});

netStatsRouter.get('/:piId/history', async (req, res) => {
  const pi = getPiById(req.params.piId);
  if (!pi) return res.status(404).json({ error: 'PI not found' });

  try {
    const params = new URLSearchParams();
    if (typeof req.query.iface === 'string') params.set('iface', req.query.iface);
    if (typeof req.query.limit === 'string') params.set('limit', req.query.limit);

    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    const response = await fetch(`${config.logServerUrl}/api/net-metrics/${pi.id}/history${suffix}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(502).json({ error: 'Log server unavailable' });
  }
});
