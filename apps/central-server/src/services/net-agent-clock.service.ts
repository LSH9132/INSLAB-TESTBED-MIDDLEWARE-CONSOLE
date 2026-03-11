import { config } from '../config.js';
import { getAllPis } from './pi-registry.service.js';
import { runNetAgentRemoteAction } from './net-agent-remote.service.js';

const syncingPis = new Set<string>();

async function syncOnlinePiClocks() {
  const onlinePis = getAllPis().filter(pi => pi.status === 'online');

  await Promise.all(
    onlinePis.map(async pi => {
      if (syncingPis.has(pi.id)) {
        return;
      }

      syncingPis.add(pi.id);
      try {
        await runNetAgentRemoteAction(pi, 'sync-time');
      } catch {
        // Leave time sync best-effort. PI-specific failures should not stop the loop.
      } finally {
        syncingPis.delete(pi.id);
      }
    }),
  );
}

export function startNetAgentClockSyncMonitor() {
  syncOnlinePiClocks().catch(() => {
    // Initial sync is best-effort.
  });

  setInterval(() => {
    syncOnlinePiClocks().catch(() => {
      // Periodic sync keeps running across transient SSH failures.
    });
  }, Math.max(60_000, config.netAgentClockSyncIntervalMs));
}
