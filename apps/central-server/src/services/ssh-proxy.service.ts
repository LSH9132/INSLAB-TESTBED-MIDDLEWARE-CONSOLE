import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import { config } from '../config.js';
import type WebSocket from 'ws';
import type { PiAuthMethod } from '@inslab/shared';

export function attachTerminal(
  ws: WebSocket,
  host: string,
  port: number,
  username: string,
  authMethod: PiAuthMethod = 'key',
  sshPassword?: string | null,
) {
  const ssh = new Client();

  ssh.on('ready', () => {
    ssh.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        ws.send(`\r\nSSH shell error: ${err.message}\r\n`);
        ws.close();
        return;
      }

      stream.on('data', (data: Buffer) => {
        if (ws.readyState === ws.OPEN) ws.send(data);
      });

      stream.on('close', () => {
        ws.close();
        ssh.end();
      });

      ws.on('message', (msg: Buffer | string) => {
        try {
          const parsed = JSON.parse(msg.toString());
          if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
            stream.setWindow(parsed.rows, parsed.cols, 0, 0);
            return;
          }
        } catch {
          // not JSON, treat as terminal data
        }
        stream.write(msg);
      });

      ws.on('close', () => {
        stream.close();
        ssh.end();
      });
    });
  });

  ssh.on('error', (err) => {
    ws.send(`\r\nSSH connection error: ${err.message}\r\n`);
    ws.close();
  });

  try {
    const connectOptions: any = {
      host,
      port,
      username,
    };

    if (authMethod === 'password' && sshPassword) {
      connectOptions.password = sshPassword;
    } else {
      const keyPath = config.sshPrivateKeyPath.replace('~', process.env.HOME || '');
      connectOptions.privateKey = readFileSync(keyPath);
    }

    ssh.connect(connectOptions);
  } catch (err: any) {
    ws.send(`\r\nFailed to start SSH connection: ${err.message}\r\n`);
    ws.close();
  }
}
