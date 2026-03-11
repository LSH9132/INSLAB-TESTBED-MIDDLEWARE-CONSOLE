import type { NetworkStatSnapshot } from '@inslab/shared';
import { config } from '../config.js';
import { getAllPis } from './pi-registry.service.js';
import { broadcastNetStats } from '../ws/net-stats.handler.js';
import { getNetStatsSettings } from './app-settings.service.js';

const lastBroadcastAt = new Map<string, number>();

function isFreshSnapshot(snapshot: NetworkStatSnapshot): boolean {
  const freshnessTimestamp = snapshot.receivedAt ?? snapshot.timestamp;
  const snapshotMs = freshnessTimestamp < 1_000_000_000_000 ? freshnessTimestamp * 1000 : freshnessTimestamp;
  return Date.now() - snapshotMs <= getNetStatsSettings().freshnessSec * 1000;
}

export function startNetworkMonitor() {
  const poll = async () => {
    const pis = getAllPis().filter(pi => pi.status === 'online');

    await Promise.all(
      pis.map(async pi => {
        try {
          const response = await fetch(`${config.logServerUrl}/api/net-metrics/${pi.id}/latest`);
          if (!response.ok) return;

          const snapshot = (await response.json()) as NetworkStatSnapshot;
          if (!snapshot.interfaces?.length) return;
          if (!isFreshSnapshot(snapshot)) return;

          const previousTimestamp = lastBroadcastAt.get(pi.id);
          if (previousTimestamp === snapshot.timestamp) return;

          lastBroadcastAt.set(pi.id, snapshot.timestamp);
          broadcastNetStats(snapshot);
        } catch {
          // Skip transient log-server or network failures.
        }
      }),
    );
  };

  poll().catch(() => {
    // Initial broadcast is best-effort.
  });

  const loop = () => {
    const nextDelayMs = Math.max(1, getNetStatsSettings().pollIntervalSec || Math.round(config.netStatsPollIntervalMs / 1000)) * 1000;
    setTimeout(() => {
      poll().catch(() => {
        // Broadcast loop stays alive across transient failures.
      }).finally(loop);
    }, nextDelayMs);
  };

  loop();
}
