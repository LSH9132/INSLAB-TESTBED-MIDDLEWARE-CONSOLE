import type WebSocket from 'ws';
import { getPiById } from '../services/pi-registry.service.js';
import { attachTerminal } from '../services/ssh-proxy.service.js';

export function handleTerminalConnection(ws: WebSocket, piId: string) {
  const pi = getPiById(piId);
  if (!pi) {
    ws.send(`\r\nPi not found: ${piId}\r\n`);
    ws.close();
    return;
  }

  ws.send(`\r\nConnecting to ${pi.hostname} (${pi.ipManagement})...\r\n`);
  attachTerminal(ws, pi.ipManagement, pi.sshPort, pi.sshUser);
}
