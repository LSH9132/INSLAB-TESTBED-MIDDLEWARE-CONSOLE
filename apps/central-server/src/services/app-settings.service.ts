import { getDb } from '../db/connection.js';
import { config } from '../config.js';

const NET_STATS_POLL_INTERVAL_KEY = 'net_stats_poll_interval_sec';
const NET_STATS_FRESHNESS_KEY = 'net_stats_freshness_sec';

function getNumberSetting(key: string, fallback: number): number {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value?: string } | undefined;
  if (!row?.value) return fallback;
  const parsed = Number(row.value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function setNumberSetting(key: string, value: number) {
  getDb()
    .prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, unixepoch())
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)
    .run(key, String(value));
}

export interface NetStatsSettings {
  pollIntervalSec: number;
  freshnessSec: number;
}

export function getNetStatsSettings(): NetStatsSettings {
  return {
    pollIntervalSec: getNumberSetting(NET_STATS_POLL_INTERVAL_KEY, Math.max(1, Math.round(config.netStatsPollIntervalMs / 1000))),
    freshnessSec: getNumberSetting(NET_STATS_FRESHNESS_KEY, Math.max(5, Math.round(config.netStatsFreshnessMs / 1000))),
  };
}

export function updateNetStatsSettings(settings: NetStatsSettings): NetStatsSettings {
  setNumberSetting(NET_STATS_POLL_INTERVAL_KEY, settings.pollIntervalSec);
  setNumberSetting(NET_STATS_FRESHNESS_KEY, settings.freshnessSec);
  return getNetStatsSettings();
}
