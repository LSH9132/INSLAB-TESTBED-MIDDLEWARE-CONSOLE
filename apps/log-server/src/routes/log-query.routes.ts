import { Router } from 'express';
import { getDb } from '../db/connection.js';

export const logQueryRouter = Router();

logQueryRouter.get('/', (req, res) => {
  const { piId, logType, from, to, limit = '100', offset = '0' } = req.query as Record<string, string>;

  let sql = 'SELECT * FROM logs WHERE 1=1';
  const params: any[] = [];

  if (piId) { sql += ' AND source_pi = ?'; params.push(piId); }
  if (logType) { sql += ' AND log_type = ?'; params.push(logType); }
  if (from) { sql += ' AND timestamp >= ?'; params.push(Number(from)); }
  if (to) { sql += ' AND timestamp <= ?'; params.push(Number(to)); }

  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = getDb().prepare(sql).all(...params);
  res.json(rows);
});
