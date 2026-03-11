import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { NetMetricSample, NetworkInterfaceStat, NetworkStatSnapshot } from '@inslab/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NetMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(samples: NetMetricSample[]) {
    if (!Array.isArray(samples) || samples.length === 0) {
      throw new BadRequestException('samples are required');
    }

    await this.prisma.networkInterfaceSample.createMany({
      data: samples.map(sample => this.toCreateInput(sample)),
      skipDuplicates: true,
    });

    return { success: true, accepted: samples.length };
  }

  async getLatest(nodeId: string): Promise<NetworkStatSnapshot> {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT DISTINCT ON (iface)
        node_id,
        iface,
        timestamp,
        received_at,
        rx_bytes,
        tx_bytes,
        rx_packets,
        tx_packets,
        rx_bps,
        tx_bps,
        rx_pps,
        tx_pps
      FROM network_interface_samples
      WHERE node_id = ${nodeId}
      ORDER BY iface, received_at DESC, timestamp DESC
    `);

    const interfaces = rows.map(row => this.toNetworkInterfaceStat(row));
    const timestamp = interfaces.reduce((latest, item) => Math.max(latest, item.timestamp), 0);
    const receivedAt = rows.reduce((latest, row) => Math.max(latest, this.toUnixSeconds(row.received_at)), 0);

    return {
      piId: nodeId,
      timestamp,
      receivedAt,
      interfaces,
    };
  }

  async getHistory(nodeId: string, iface?: string, limit = 60): Promise<NetworkInterfaceStat[]> {
    if (limit <= 0) {
      throw new BadRequestException('limit must be positive');
    }

    const rows = iface
      ? await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT
            iface,
            timestamp,
            rx_bytes,
            tx_bytes,
            rx_packets,
            tx_packets,
            rx_bps,
            tx_bps,
            rx_pps,
            tx_pps
          FROM network_interface_samples
          WHERE node_id = ${nodeId} AND iface = ${iface}
          ORDER BY received_at DESC, timestamp DESC
          LIMIT ${limit}
        `)
      : await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT
            iface,
            timestamp,
            rx_bytes,
            tx_bytes,
            rx_packets,
            tx_packets,
            rx_bps,
            tx_bps,
            rx_pps,
            tx_pps
          FROM network_interface_samples
          WHERE node_id = ${nodeId}
          ORDER BY received_at DESC, timestamp DESC
          LIMIT ${limit}
        `);

    return rows.map(row => this.toNetworkInterfaceStat(row));
  }

  private toCreateInput(sample: NetMetricSample) {
    return {
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
    };
  }

  private toNetworkInterfaceStat(row: Record<string, unknown>): NetworkInterfaceStat {
    const timestamp = this.toUnixSeconds(row.timestamp);

    return {
      iface: String(row.iface),
      rxBytes: Number(row.rx_bytes),
      txBytes: Number(row.tx_bytes),
      rxPackets: Number(row.rx_packets),
      txPackets: Number(row.tx_packets),
      rxBps: Number(row.rx_bps),
      txBps: Number(row.tx_bps),
      rxPps: Number(row.rx_pps),
      txPps: Number(row.tx_pps),
      timestamp,
    };
  }

  private toUnixSeconds(value: unknown): number {
    if (value instanceof Date) {
      return Math.floor(value.getTime() / 1000);
    }

    return Math.floor(new Date(String(value)).getTime() / 1000);
  }
}
