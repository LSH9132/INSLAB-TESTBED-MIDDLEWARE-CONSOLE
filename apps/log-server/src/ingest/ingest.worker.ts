import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import type { NetMetricSample } from '@inslab/shared';

@Injectable()
export class IngestWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestWorker.name);
  private redis: Redis;
  private isRunning = false;
  private batchSize = 1000;
  private batchTimeoutMs = 1000; // 1 second

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.isRunning = true;
    this.startWorkerLoop();
    this.logger.log('Ingest Worker started');
  }

  onModuleDestroy() {
    this.isRunning = false;
    this.redis?.disconnect();
  }

  private async startWorkerLoop() {
    while (this.isRunning) {
      try {
        const logBatch: any[] = [];
        const metricBatch: NetMetricSample[] = [];
        const startTime = Date.now();

        // Accumulate a batch
        while ((logBatch.length + metricBatch.length) < this.batchSize && (Date.now() - startTime) < this.batchTimeoutMs) {
          // Block for max 1 second
          const result = await this.redis.brpop(['logs:ingest', 'net-metrics:ingest'], 1);
          if (result) {
            const [queue, data] = result;
            try {
              const parsed = JSON.parse(data);
              if (queue === 'logs:ingest') {
                logBatch.push(parsed);
              } else {
                metricBatch.push(parsed as NetMetricSample);
              }
            } catch (e) {
              this.logger.warn(`Failed to parse payload from ${queue}`);
            }
          }
        }

        if (logBatch.length > 0) {
          await this.flushLogs(logBatch);
        }

        if (metricBatch.length > 0) {
          await this.flushNetMetrics(metricBatch);
        }
      } catch (err: any) {
        this.logger.error(`Error in ingest loop: ${err.message}`);
        // Wait a bit before retrying on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async flushLogs(logs: any[]) {
    try {
      const data = logs.map(log => ({
        timestamp: new Date(log.timestamp),
        sourcePi: log.sourcePi || log.piId || 'unknown',
        destPi: log.destPi || null,
        seqNum: log.seqNum ? Number(log.seqNum) : null,
        logType: log.type || log.logType || null,
        payload: JSON.stringify(log.payload || log.data || log),
      }));

      await this.prisma.log.createMany({
        data,
      });

      this.logger.debug(`Flushed batch of ${logs.length} logs to DB`);
    } catch (err: any) {
      this.logger.error(`Failed to flush batch to DB: ${err.message}`);
      // In a real production system, you might want to push these back to a Dead Letter Queue (DLQ)
    }
  }

  private async flushNetMetrics(samples: NetMetricSample[]) {
    try {
      await this.prisma.networkInterfaceSample.createMany({
        data: samples.map(sample => ({
          nodeId: sample.nodeId,
          iface: sample.iface,
          timestamp: new Date(sample.timestamp),
          seq: sample.seq ?? null,
          rxBytes: BigInt(Math.trunc(sample.rxBytes)),
          txBytes: BigInt(Math.trunc(sample.txBytes)),
          rxPackets: BigInt(Math.trunc(sample.rxPackets)),
          txPackets: BigInt(Math.trunc(sample.txPackets)),
          rxBps: sample.rxBps,
          txBps: sample.txBps,
          rxPps: sample.rxPps,
          txPps: sample.txPps,
          agentVersion: sample.agentVersion ?? null,
        })),
        skipDuplicates: true,
      });

      this.logger.debug(`Flushed batch of ${samples.length} net metrics to DB`);
    } catch (err: any) {
      this.logger.error(`Failed to flush net metrics to DB: ${err.message}`);
    }
  }
}
