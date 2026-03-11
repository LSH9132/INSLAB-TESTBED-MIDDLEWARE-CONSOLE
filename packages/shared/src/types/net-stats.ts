export interface NetworkInterfaceStat {
  iface: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxBps: number;
  txBps: number;
  rxPps: number;
  txPps: number;
  timestamp: number;
}

export interface NetworkStatSnapshot {
  piId: string;
  timestamp: number;
  receivedAt?: number;
  interfaces: NetworkInterfaceStat[];
}

export interface NetStatsWsMessage {
  type: 'net-stats';
  data: NetworkStatSnapshot;
}

export interface NetMetricSample {
  nodeId: string;
  iface: string;
  timestamp: number;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxBps: number;
  txBps: number;
  rxPps: number;
  txPps: number;
  seq?: number;
  agentVersion?: string;
}

export interface NetMetricIngestEnvelope {
  kind: 'net_sample';
  protocolVersion: number;
  authToken: string;
  sample: NetMetricSample;
}

export interface NetAgentCompatibilityInfo {
  protocolVersion: number;
  minAgentVersion: string;
  recommendedAgentVersion: string;
  tcpPort: number;
  issuedAt: number;
}

export interface NetAgentConfigResponse {
  nodeId: string;
  protocolVersion: number;
  minAgentVersion: string;
  recommendedAgentVersion: string;
  logServerHost: string;
  logServerPort: number;
  sampleIntervalSec: number;
  tokenExpiresAt: number;
  authToken: string;
  envFileContent: string;
}
