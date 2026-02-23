export type PiAuthMethod = 'key' | 'password';
export type PiStatus = 'online' | 'offline' | 'unknown';

export interface PiNode {
  id: string;
  name: string;
  ip: string;
  sshPort: number;
  sshUser: string;
  authMethod: PiAuthMethod;
  status: PiStatus;
  lastSeen: number | null;
  createdAt: number;
}

export interface PiCreateRequest {
  name: string;
  ip: string;
  sshPort?: number;
  sshUser?: string;
  authMethod?: PiAuthMethod;
  sshPassword?: string;
}
