import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryLogDto } from './dto/query-log.dto';

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(query: QueryLogDto) {
    const { piId, sourcePi, startTime, endTime, logType } = query;
    const limit = Number(query.limit) || 100;
    const offset = Number(query.offset) || 0;

    const where: Prisma.LogWhereInput = {};

    // Support both piId (old format) and sourcePi (new format)
    const targetPi = piId || sourcePi;
    if (targetPi) {
      where.sourcePi = targetPi;
    }

    if (logType) {
      where.logType = logType;
    }

    if (startTime || endTime) {
      where.timestamp = {
        ...(startTime ? { gte: new Date(startTime) } : {}),
        ...(endTime ? { lte: new Date(endTime) } : {}),
      };
    }

    const [totalItems, logs] = await Promise.all([
      this.prisma.log.count({ where }),
      this.prisma.log.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    // Format logs to match expected output for Central Server/Frontend
    const formattedLogs = logs.map(log => ({
      ...log,
      id: log.id.toString(), // BigInt cannot be directly JSON serialized
    }));

    return {
      success: true,
      data: formattedLogs,
      pagination: {
        totalItems,
        limit,
        offset,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }
}
