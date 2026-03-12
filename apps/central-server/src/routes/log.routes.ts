import { Router } from 'express';
import { config } from '../config.js';

export const logRouter = Router();

interface LogServerLogEntry {
  id: string | number;
  timestamp: string | number;
  sourcePi?: string;
  destPi?: string | null;
  seqNum?: number | null;
  logType?: string | null;
  payload?: string;
}

logRouter.get('/', async (req, res) => {
  try {
    const params = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${config.logServerUrl}/api/logs?${params}`);
    const body = await response.json();
    const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
    const normalized = rows.map((row: LogServerLogEntry) => ({
      id: typeof row.id === 'string' ? Number(row.id) || row.id : row.id,
      timestamp: typeof row.timestamp === 'string' ? new Date(row.timestamp).getTime() : row.timestamp,
      source_pi: row.sourcePi ?? 'unknown',
      dest_pi: row.destPi ?? null,
      seq_num: row.seqNum ?? null,
      log_type: row.logType ?? 'system',
      payload: row.payload ?? '',
    }));

    res.json(normalized);
  } catch (err) {
    res.status(502).json({ error: 'Log server unavailable' });
  }
});
