import net from 'net';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import type { LogIngest } from '@inslab/shared';

export function startTcpReceiver() {
  const insertStmt = getDb().prepare(`
    INSERT INTO logs (timestamp, source_pi, dest_pi, seq_num, log_type, payload)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const server = net.createServer((socket) => {
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const log: LogIngest = JSON.parse(line);
          insertStmt.run(
            log.timestamp,
            log.piId,
            log.dest || null,
            log.seqNum ?? null,
            log.type,
            log.payload,
          );
        } catch {
          console.error('Invalid log line:', line);
        }
      }
    });
  });

  server.listen(config.tcpPort, () => {
    console.log(`TCP log receiver on port ${config.tcpPort}`);
  });
}
