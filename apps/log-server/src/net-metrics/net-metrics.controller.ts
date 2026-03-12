import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { NetMetricIngestEnvelope, NetMetricSample } from '@inslab/shared';
import { NetMetricsService } from './net-metrics.service';
import { isSupportedProtocolVersion, verifyNetAgentToken } from './net-agent-auth';

@Controller('api/net-metrics')
export class NetMetricsController {
  constructor(private readonly netMetricsService: NetMetricsService) {}

  @Post('ingest')
  async ingest(
    @Body() body:
      | NetMetricSample
      | NetMetricIngestEnvelope
      | { samples?: NetMetricSample[] }
      | { envelopes?: NetMetricIngestEnvelope[] },
  ) {
    let samples: NetMetricSample[] = [];

    if (Array.isArray((body as { envelopes?: NetMetricIngestEnvelope[] }).envelopes)) {
      const envelopes = (body as { envelopes: NetMetricIngestEnvelope[] }).envelopes;
      for (const envelope of envelopes) {
        this.assertAuthorizedEnvelope(envelope);
      }
      samples = envelopes.map(envelope => envelope.sample);
    } else if (this.isEnvelope(body)) {
      this.assertAuthorizedEnvelope(body);
      samples = [body.sample];
    } else if (Array.isArray((body as { samples?: NetMetricSample[] }).samples)) {
      samples = (body as { samples: NetMetricSample[] }).samples;
    } else {
      samples = [body as NetMetricSample];
    }

    return this.netMetricsService.ingest(samples);
  }

  @Get(':nodeId/latest')
  async latest(@Param('nodeId') nodeId: string) {
    return this.netMetricsService.getLatest(nodeId);
  }

  @Get(':nodeId/history')
  async history(
    @Param('nodeId') nodeId: string,
    @Query('iface') iface?: string,
    @Query('limit') limit?: string,
  ) {
    return this.netMetricsService.getHistory(nodeId, iface, limit ? Number(limit) : 60);
  }

  private assertAuthorizedEnvelope(envelope: NetMetricIngestEnvelope) {
    if (!isSupportedProtocolVersion(envelope.protocolVersion)) {
      throw new BadRequestException('protocol version mismatch');
    }

    if (!verifyNetAgentToken(envelope.authToken, envelope.sample.nodeId, envelope.protocolVersion)) {
      throw new BadRequestException('invalid auth token');
    }
  }

  private isEnvelope(value: unknown): value is NetMetricIngestEnvelope {
    return Boolean(
      value &&
        typeof value === 'object' &&
        (value as NetMetricIngestEnvelope).kind === 'net_sample' &&
        typeof (value as NetMetricIngestEnvelope).protocolVersion === 'number' &&
        typeof (value as NetMetricIngestEnvelope).authToken === 'string' &&
        typeof (value as NetMetricIngestEnvelope).sample?.nodeId === 'string',
    );
  }
}
