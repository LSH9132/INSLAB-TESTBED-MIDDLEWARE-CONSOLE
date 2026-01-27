import type WebSocket from 'ws';

const statusClients = new Set<WebSocket>();

export function addStatusClient(ws: WebSocket) {
  statusClients.add(ws);
  ws.on('close', () => statusClients.delete(ws));
}

export function broadcastStatus(piId: string, status: string) {
  const msg = JSON.stringify({ type: 'pi_status', piId, status, timestamp: Date.now() });
  for (const client of statusClients) {
    if (client.readyState === client.OPEN) {
      client.send(msg);
    }
  }
}
