import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { NetMetricSample } from '@inslab/shared';
import { NetMetricsService } from './net-metrics.service';

@Controller('api/net-metrics')
export class NetMetricsController {
  constructor(private readonly netMetricsService: NetMetricsService) {}

  @Post('ingest')
  async ingest(@Body() body: NetMetricSample | { samples?: NetMetricSample[] }) {
    const samples = Array.isArray((body as { samples?: NetMetricSample[] }).samples)
      ? (body as { samples: NetMetricSample[] }).samples
      : [body as NetMetricSample];

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
}
