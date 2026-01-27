import { Router } from 'express';
import { config } from '../config.js';

export const logRouter = Router();

logRouter.get('/', async (req, res) => {
  try {
    const params = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${config.logServerUrl}/api/logs?${params}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Log server unavailable' });
  }
});
