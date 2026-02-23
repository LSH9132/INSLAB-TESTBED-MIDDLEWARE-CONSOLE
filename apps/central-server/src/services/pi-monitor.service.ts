import net from 'net';
import { getAllPis, updatePiStatus } from './pi-registry.service.js';
import { PI_HEALTH_CHECK_INTERVAL_MS } from '@inslab/shared';
import { broadcastStatus } from '../ws/status.handler.js';

export function startMonitor() {
  setInterval(async () => {
    const pis = getAllPis();
    for (const pi of pis) {
      const online = await checkTcpPort(pi.ip, pi.sshPort);
      const status = online ? 'online' : 'offline';
      if (status !== pi.status) {
        updatePiStatus(pi.id, status);
        broadcastStatus(pi.id, status);
      }
    }
  }, PI_HEALTH_CHECK_INTERVAL_MS);
}

function checkTcpPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}
