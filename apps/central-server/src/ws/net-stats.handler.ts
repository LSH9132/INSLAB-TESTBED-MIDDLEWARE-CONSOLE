import type WebSocket from 'ws';
import type { NetworkStatSnapshot } from '@inslab/shared';

const clients = new Set<WebSocket>();

export function registerNetStatsClient(ws: WebSocket) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
}

export function broadcastNetStats(snapshot: NetworkStatSnapshot) {
  const msg = JSON.stringify({ type: 'net-stats', data: snapshot });
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}
