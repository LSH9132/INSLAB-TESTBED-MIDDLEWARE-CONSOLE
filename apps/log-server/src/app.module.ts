import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { TcpModule } from './tcp/tcp.module';
import { IngestModule } from './ingest/ingest.module';
import { LogsModule } from './logs/logs.module';
import { HealthModule } from './health/health.module';
import { NetMetricsModule } from './net-metrics/net-metrics.module';

@Module({
  imports: [TcpModule, IngestModule, LogsModule, HealthModule, NetMetricsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
