import { Router } from 'express';
import { getSystemStatus } from '../services/system-status.service.js';
import { getNetStatsSettings, updateNetStatsSettings } from '../services/app-settings.service.js';

export const systemRouter = Router();

interface NetworkCollectionSettings {
  pollIntervalSec: number;
  freshnessSec: number;
}

systemRouter.get('/status', async (_req, res) => {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (error) {
    console.error('System status check error:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

systemRouter.get('/net-settings', (_req, res) => {
  const settings = getNetStatsSettings();
  const response: NetworkCollectionSettings = {
    pollIntervalSec: settings.pollIntervalSec,
    freshnessSec: settings.freshnessSec,
  };
  res.json(response);
});

systemRouter.put('/net-settings', (req, res) => {
  const pollIntervalSec = Number(req.body?.pollIntervalSec);
  const freshnessSec = Number(req.body?.freshnessSec);

  if (!Number.isInteger(pollIntervalSec) || pollIntervalSec < 1 || pollIntervalSec > 300) {
    return res.status(400).json({ error: 'pollIntervalSec must be an integer between 1 and 300' });
  }

  if (!Number.isInteger(freshnessSec) || freshnessSec < 5 || freshnessSec > 3600) {
    return res.status(400).json({ error: 'freshnessSec must be an integer between 5 and 3600' });
  }

  if (freshnessSec < pollIntervalSec) {
    return res.status(400).json({ error: 'freshnessSec must be greater than or equal to pollIntervalSec' });
  }

  const settings = updateNetStatsSettings({ pollIntervalSec, freshnessSec });
  const response: NetworkCollectionSettings = {
    pollIntervalSec: settings.pollIntervalSec,
    freshnessSec: settings.freshnessSec,
  };
  res.json(response);
});
