export interface NetworkInterfaceStat {
  iface: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxBps: number; // bytes per second
  txBps: number;
  rxPps: number; // packets per second
  txPps: number;
  timestamp: number; // unix seconds
}

export interface NetworkStatSnapshot {
  piId: string;
  timestamp: number;
  interfaces: NetworkInterfaceStat[];
}

export interface NetStatsWsMessage {
  type: 'net-stats';
  data: NetworkStatSnapshot;
}
