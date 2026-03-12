import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import type { NetMetricSample } from '@inslab/shared';

type IngestLogRecord = Record<string, unknown>;

@Injectable()
export class IngestWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestWorker.name);
  private redis: Redis;
  private isRunning = false;
  private batchSize = 1000;
  private batchTimeoutMs = 1000; // 1 second

  constructor(private readonly prisma: PrismaService) {}

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }

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
        const logBatch: IngestLogRecord[] = [];
        const metricBatch: NetMetricSample[] = [];
        const startTime = Date.now();

        // Accumulate a batch
        while ((logBatch.length + metricBatch.length) < this.batchSize && (Date.now() - startTime) < this.batchTimeoutMs) {
          // Block for max 1 second
          const result = await this.redis.brpop(['logs:ingest', 'net-metrics:ingest'], 1);
          if (result) {
            const [queue, data] = result;
            try {
              const parsed = JSON.parse(data) as unknown;
              if (queue === 'logs:ingest') {
                if (parsed && typeof parsed === 'object') {
                  logBatch.push(parsed as IngestLogRecord);
                }
              } else {
                metricBatch.push(parsed as NetMetricSample);
              }
            } catch {
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
      } catch (err: unknown) {
        this.logger.error(`Error in ingest loop: ${this.getErrorMessage(err)}`);
        // Wait a bit before retrying on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async flushLogs(logs: IngestLogRecord[]) {
    try {
      const data = logs.map(log => ({
        timestamp: this.normalizeLogTimestamp(log.timestamp),
        sourcePi: this.normalizeSourcePi(log),
        destPi: this.normalizeOptionalString(log.destPi),
        seqNum: log.seqNum ? Number(log.seqNum) : null,
        logType: this.normalizeOptionalString(log.type) ?? this.normalizeOptionalString(log.logType),
        payload: this.normalizeLogPayload(log),
      }));

      await this.prisma.log.createMany({
        data,
      });

      this.logger.debug(`Flushed batch of ${logs.length} logs to DB`);
    } catch (err: unknown) {
      this.logger.error(`Failed to flush batch to DB: ${this.getErrorMessage(err)}`);
      // In a real production system, you might want to push these back to a Dead Letter Queue (DLQ)
    }
  }

  private normalizeLogTimestamp(raw: unknown): Date {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return new Date(raw);
    }

    if (typeof raw === 'string' && raw.trim().length > 0) {
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        return new Date(numeric);
      }

      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
  }

  private normalizeLogPayload(log: Record<string, unknown>): string {
    const candidate = log.payload ?? log.data ?? log;
    if (typeof candidate === 'string') {
      return candidate;
    }

    try {
      return JSON.stringify(candidate);
    } catch {
      return String(candidate);
    }
  }

  private normalizeOptionalString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    return null;
  }

  private normalizeSourcePi(log: IngestLogRecord): string {
    return this.normalizeOptionalString(log.sourcePi) ?? this.normalizeOptionalString(log.piId) ?? 'unknown';
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
    } catch (err: unknown) {
      this.logger.error(`Failed to flush net metrics to DB: ${this.getErrorMessage(err)}`);
    }
  }
}
