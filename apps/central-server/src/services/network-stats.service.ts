import { Client } from 'ssh2';
import { getAllPis } from './pi-registry.service.js';
import { insertNetStats, pruneOldNetStats } from '../db/net-stats.db.js';
import { broadcastNetStats } from '../ws/net-stats.handler.js';
import type { PiNode, NetworkInterfaceStat } from '@inslab/shared';

const NET_STATS_INTERVAL_MS = 5_000;

// Previous raw counters per PI (for delta calculation)
const prevCounters = new Map<string, Map<string, RawCounter>>();

interface RawCounter {
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  timestamp: number; // ms
}

export function startNetworkMonitor() {
  setInterval(async () => {
    const pis = getAllPis().filter(p => p.status === 'online');
    for (const pi of pis) {
      fetchAndStore(pi).catch(() => {
        // Silently skip offline/unreachable PIs
      });
    }
  }, NET_STATS_INTERVAL_MS);

  // Prune old data every 5 minutes
  setInterval(pruneOldNetStats, 5 * 60 * 1000);
}

async function fetchAndStore(pi: PiNode): Promise<void> {
  const raw = await sshExec(pi, 'cat /proc/net/dev');
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);

  const parsed = parseProNetDev(raw);
  if (!parsed.length) return;

  const prevMap = prevCounters.get(pi.id) ?? new Map<string, RawCounter>();
  const stats: NetworkInterfaceStat[] = [];

  for (const entry of parsed) {
    const prev = prevMap.get(entry.iface);
    const deltaMs = prev ? now - prev.timestamp : NET_STATS_INTERVAL_MS;
    const deltaSec = deltaMs / 1000;

    const rxBps  = prev ? Math.max(0, (entry.rxBytes   - prev.rxBytes)   / deltaSec) : 0;
    const txBps  = prev ? Math.max(0, (entry.txBytes   - prev.txBytes)   / deltaSec) : 0;
    const rxPps  = prev ? Math.max(0, (entry.rxPackets - prev.rxPackets) / deltaSec) : 0;
    const txPps  = prev ? Math.max(0, (entry.txPackets - prev.txPackets) / deltaSec) : 0;

    prevMap.set(entry.iface, { ...entry, timestamp: now });

    stats.push({
      iface:      entry.iface,
      rxBytes:    entry.rxBytes,
      txBytes:    entry.txBytes,
      rxPackets:  entry.rxPackets,
      txPackets:  entry.txPackets,
      rxBps,
      txBps,
      rxPps,
      txPps,
      timestamp: nowSec,
    });
  }

  prevCounters.set(pi.id, prevMap);

  insertNetStats(pi.id, stats);
  broadcastNetStats({ piId: pi.id, timestamp: nowSec, interfaces: stats });
}

// ─── SSH exec helper ────────────────────────────────────────────────────────

function sshExec(pi: PiNode, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ssh = new Client();
    let output = '';

    ssh.on('ready', () => {
      ssh.exec(command, (err, stream) => {
        if (err) { ssh.end(); return reject(err); }
        stream.on('data', (d: Buffer) => { output += d.toString(); });
        stream.stderr.on('data', () => {});
        stream.on('close', () => { ssh.end(); resolve(output); });
      });
    });

    ssh.on('error', reject);

    const connectOptions: any = {
      host:     pi.ip,
      port:     pi.sshPort,
      username: pi.sshUser,
      readyTimeout: 4000,
    };

    if (pi.authMethod === 'password' && pi.sshPassword) {
      connectOptions.password = pi.sshPassword;
    } else if (pi.sshPrivateKey) {
      connectOptions.privateKey = pi.sshPrivateKey;
    } else {
      return reject(new Error('No credentials configured'));
    }

    ssh.connect(connectOptions);
  });
}

// ─── /proc/net/dev parser ────────────────────────────────────────────────────

interface ProcNetDevEntry {
  iface:      string;
  rxBytes:    number;
  txBytes:    number;
  rxPackets:  number;
  txPackets:  number;
}

function parseProNetDev(raw: string): ProcNetDevEntry[] {
  const result: ProcNetDevEntry[] = [];
  const lines = raw.split('\n').slice(2); // skip header lines

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const iface = trimmed.slice(0, colonIdx).trim();
    // Skip loopback
    if (iface === 'lo') continue;

    const fields = trimmed.slice(colonIdx + 1).trim().split(/\s+/);
    // /proc/net/dev columns (0-indexed after split):
    // RX: bytes(0) packets(1) errs(2) drop(3) fifo(4) frame(5) compressed(6) multicast(7)
    // TX: bytes(8) packets(9) errs(10) ...
    if (fields.length < 10) continue;

    result.push({
      iface,
      rxBytes:   parseInt(fields[0],  10) || 0,
      rxPackets: parseInt(fields[1],  10) || 0,
      txBytes:   parseInt(fields[8],  10) || 0,
      txPackets: parseInt(fields[9],  10) || 0,
    });
  }

  return result;
}
