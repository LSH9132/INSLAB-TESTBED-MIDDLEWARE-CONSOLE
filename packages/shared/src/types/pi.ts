export interface PiNode {
  id: string;
  hostname: string;
  ipManagement: string;
  ipRing: string;
  sshPort: number;
  sshUser: string;
  ringPosition: number | null;
  status: PiStatus;
  lastSeen: number | null;
  createdAt: number;
}

export type PiStatus = 'online' | 'offline' | 'unknown';

export interface PiCreateRequest {
  hostname: string;
  ipManagement: string;
  ipRing: string;
  sshPort?: number;
  sshUser?: string;
}

export interface RingTopology {
  nodes: PiNode[];
  edges: RingEdge[];
}

export interface RingEdge {
  from: string;
  to: string;
}
