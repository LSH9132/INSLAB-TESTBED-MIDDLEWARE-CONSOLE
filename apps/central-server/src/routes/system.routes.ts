import { Router } from 'express';
import { getSystemStatus } from '../services/system-status.service.js';

export const systemRouter = Router();

systemRouter.get('/status', async (_req, res) => {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (error) {
    console.error('System status check error:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});
