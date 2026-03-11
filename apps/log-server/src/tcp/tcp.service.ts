import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as net from 'net';
import Redis from 'ioredis';
import type { NetMetricIngestEnvelope, NetMetricSample } from '@inslab/shared';
import { isSupportedProtocolVersion, verifyNetAgentToken } from '../net-metrics/net-agent-auth';

@Injectable()
export class TcpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TcpService.name);
  private server: net.Server;
  private redis: Redis;

  async onModuleInit() {
    // Connect to Redis for write buffering
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Start TCP Server
    const port = Number(process.env.TCP_PORT) || 5140;
    this.server = net.createServer((socket) => this.handleConnection(socket));
    
    this.server.listen(port, () => {
      this.logger.log(`TCP Receiver listening on port ${port}`);
    });
  }

  onModuleDestroy() {
    this.server?.close();
    this.redis?.disconnect();
  }

  private handleConnection(socket: net.Socket) {
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();

      let newlineIdx;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.substring(0, newlineIdx).trim();
        buffer = buffer.substring(newlineIdx + 1);

        if (line) {
          this.processLine(line, socket).catch(err => {
            this.logger.error(`Error processing log line: ${err.message}`, err.stack);
            socket.write('ERR\n');
          });
        }
      }
    });

    socket.on('error', (err) => {
      this.logger.error(`TCP Socket error: ${err.message}`);
    });
  }

  private async processLine(line: string, socket: net.Socket) {
    try {
      const parsed = JSON.parse(line);
      if (this.isNetMetricEnvelope(parsed)) {
        if (!isSupportedProtocolVersion(parsed.protocolVersion)) {
          socket.write('ERR version_mismatch\n');
          return;
        }

        if (!verifyNetAgentToken(parsed.authToken, parsed.sample.nodeId, parsed.protocolVersion)) {
          socket.write('ERR unauthorized\n');
          return;
        }

        await this.redis.lpush('net-metrics:ingest', JSON.stringify(parsed.sample));
        socket.write('ACK\n');
        return;
      }

      if (this.isNetMetricSample(parsed)) {
        await this.redis.lpush('net-metrics:ingest', JSON.stringify(parsed));
        socket.write('ACK\n');
        return;
      }

      if (parsed.piId || parsed.sourcePi) {
        await this.redis.lpush('logs:ingest', line);
        socket.write('ACK\n');
        return;
      }

      socket.write('ERR\n');
    } catch (e) {
      this.logger.debug(`Invalid JSON received: ${line.substring(0, 50)}...`);
      socket.write('ERR\n');
    }
  }

  private isNetMetricEnvelope(value: unknown): value is NetMetricIngestEnvelope {
    return Boolean(
      value &&
        typeof value === 'object' &&
        (value as NetMetricIngestEnvelope).kind === 'net_sample' &&
        typeof (value as NetMetricIngestEnvelope).protocolVersion === 'number' &&
        typeof (value as NetMetricIngestEnvelope).authToken === 'string' &&
        this.isNetMetricSample((value as NetMetricIngestEnvelope).sample),
    );
  }

  private isNetMetricSample(value: unknown): value is NetMetricSample {
    if (!value || typeof value !== 'object') return false;
    const sample = value as Record<string, unknown>;
    return (
      typeof sample.nodeId === 'string' &&
      typeof sample.iface === 'string' &&
      typeof sample.timestamp === 'number' &&
      typeof sample.rxBytes === 'number' &&
      typeof sample.txBytes === 'number' &&
      typeof sample.rxPackets === 'number' &&
      typeof sample.txPackets === 'number' &&
      typeof sample.rxBps === 'number' &&
      typeof sample.txBps === 'number' &&
      typeof sample.rxPps === 'number' &&
      typeof sample.txPps === 'number'
    );
  }
}
