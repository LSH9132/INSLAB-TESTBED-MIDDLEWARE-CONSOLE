import { Module } from '@nestjs/common';
import { IngestWorker } from './ingest.worker';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [IngestWorker, PrismaService],
})
export class IngestModule {}
