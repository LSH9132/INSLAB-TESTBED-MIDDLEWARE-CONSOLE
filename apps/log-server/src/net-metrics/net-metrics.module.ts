import { Module } from '@nestjs/common';
import { NetMetricsController } from './net-metrics.controller';
import { NetMetricsService } from './net-metrics.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [NetMetricsController],
  providers: [NetMetricsService, PrismaService],
})
export class NetMetricsModule {}
