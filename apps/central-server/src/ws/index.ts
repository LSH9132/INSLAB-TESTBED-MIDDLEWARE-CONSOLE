import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import { WS_PATH_TERMINAL, WS_PATH_STATUS } from '@inslab/shared';
import { handleTerminalConnection } from './terminal.handler.js';
import { addStatusClient } from './status.handler.js';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const url = req.url || '';

    if (url === WS_PATH_STATUS) {
      addStatusClient(ws);
      return;
    }

    const termMatch = url.match(new RegExp(`^${WS_PATH_TERMINAL}/(.+)$`));
    if (termMatch) {
      handleTerminalConnection(ws, termMatch[1]);
      return;
    }

    ws.close(4000, 'Unknown path');
  });
}
