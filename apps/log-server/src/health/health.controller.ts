import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getNetAgentCompatibilityInfo } from '../net-metrics/net-agent-auth';

@Controller('api/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Check Postgres via Prisma
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        db: 'connected',
        version: '2.0.0-nestjs',
        compatibility: getNetAgentCompatibilityInfo(),
      };
    } catch (e: unknown) {
      return {
        status: 'error',
        db: 'disconnected',
        error: e instanceof Error ? e.message : 'unknown error',
      };
    }
  }
}
