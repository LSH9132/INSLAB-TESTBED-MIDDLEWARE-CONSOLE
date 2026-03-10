import { getDb } from './connection.js';
import type { NetworkInterfaceStat } from '@inslab/shared';

export function initNetStatsTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS net_stats (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      pi_id     TEXT    NOT NULL,
      iface     TEXT    NOT NULL,
      rx_bytes  INTEGER NOT NULL DEFAULT 0,
      tx_bytes  INTEGER NOT NULL DEFAULT 0,
      rx_packets INTEGER NOT NULL DEFAULT 0,
      tx_packets INTEGER NOT NULL DEFAULT 0,
      rx_bps    REAL    NOT NULL DEFAULT 0,
      tx_bps    REAL    NOT NULL DEFAULT 0,
      rx_pps    REAL    NOT NULL DEFAULT 0,
      tx_pps    REAL    NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_net_stats_pi_time ON net_stats(pi_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_net_stats_iface   ON net_stats(pi_id, iface, timestamp DESC);
  `);

  ensureColumn('rx_packets', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('tx_packets', 'INTEGER NOT NULL DEFAULT 0');
}

export function insertNetStats(piId: string, stats: NetworkInterfaceStat[]) {
  const stmt = getDb().prepare(`
    INSERT INTO net_stats (
      pi_id, iface, rx_bytes, tx_bytes, rx_packets, tx_packets, rx_bps, tx_bps, rx_pps, tx_pps, timestamp
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = getDb().transaction((items: NetworkInterfaceStat[]) => {
    for (const s of items) {
      stmt.run(
        piId,
        s.iface,
        s.rxBytes,
        s.txBytes,
        s.rxPackets,
        s.txPackets,
        s.rxBps,
        s.txBps,
        s.rxPps,
        s.txPps,
        s.timestamp,
      );
    }
  });
  insertMany(stats);
}

export function getLatestNetStats(piId: string): NetworkInterfaceStat[] {
  // Get latest snapshot per interface
  const rows = getDb().prepare(`
    SELECT n.*
    FROM net_stats n
    INNER JOIN (
      SELECT iface, MAX(timestamp) as max_ts
      FROM net_stats WHERE pi_id = ?
      GROUP BY iface
    ) latest ON n.iface = latest.iface AND n.timestamp = latest.max_ts
    WHERE n.pi_id = ?
    ORDER BY n.iface
  `).all(piId, piId) as any[];
  return rows.map(rowToStat);
}

export function getNetStatsHistory(piId: string, iface?: string, limit = 60): NetworkInterfaceStat[] {
  let sql = 'SELECT * FROM net_stats WHERE pi_id = ?';
  const params: any[] = [piId];
  if (iface) { sql += ' AND iface = ?'; params.push(iface); }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  const rows = getDb().prepare(sql).all(...params) as any[];
  return rows.map(rowToStat);
}

export function pruneOldNetStats() {
  // Keep last 1 hour
  const cutoff = Math.floor(Date.now() / 1000) - 3600;
  getDb().prepare('DELETE FROM net_stats WHERE timestamp < ?').run(cutoff);
}

function rowToStat(row: any): NetworkInterfaceStat {
  return {
    iface:     row.iface,
    rxBytes:   row.rx_bytes,
    txBytes:   row.tx_bytes,
    rxPackets: row.rx_packets ?? 0,
    txPackets: row.tx_packets ?? 0,
    rxBps:     row.rx_bps,
    txBps:     row.tx_bps,
    rxPps:     row.rx_pps,
    txPps:     row.tx_pps,
    timestamp: row.timestamp,
  };
}

function ensureColumn(name: string, definition: string) {
  const columns = getDb().prepare('PRAGMA table_info(net_stats)').all() as Array<{ name: string }>;
  if (columns.some(column => column.name === name)) return;
  getDb().exec(`ALTER TABLE net_stats ADD COLUMN ${name} ${definition}`);
}
