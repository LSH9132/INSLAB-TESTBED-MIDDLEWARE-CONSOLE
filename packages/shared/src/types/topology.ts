export type LinkStatus = 'up' | 'down' | 'unknown';
export type LinkSource = 'static' | 'discovered';

export interface TopologyLink {
  id: string;
  nodeA: string;        // 'pi1'
  nodeB: string;        // 'pi2'
  vlan: number;         // 12
  iface: string;        // 'int12'
  ipA: string;          // '10.1.2.1/30'
  ipB: string;          // '10.1.2.2/30'
  status: LinkStatus;
  lastScan: number | null;
  source: LinkSource;
}

export interface TopologyNode {
  name: string;         // 'pi1'
  mgmtIp: string;       // '10.10.0.6'
  status: string;       // 'online' | 'offline' | 'unknown'
  interfaces: string[]; // ['int12', 'int14', 'int15']
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  links: TopologyLink[];
  scannedAt: number | null;
}
