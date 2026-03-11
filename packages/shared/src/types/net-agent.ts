export type NetAgentServiceState = 'active' | 'inactive' | 'failed' | 'not-installed' | 'unknown';
export type NetAgentRemoteAction = 'install' | 'configure' | 'restart' | 'sync-time' | 'uninstall';

export interface NetAgentClockStatus {
  utcTime: string | null;
  timezone: string | null;
  ntpSynchronized: boolean;
}

export interface NetAgentRemoteStatus {
  installed: boolean;
  serviceState: NetAgentServiceState;
  version: string | null;
  envConfigured: boolean;
  unitFilePath: string;
  installDir: string;
  envPath: string;
  clock: NetAgentClockStatus;
}

export interface NetAgentRemoteOperationResult {
  action: NetAgentRemoteAction;
  success: boolean;
  message: string;
  status: NetAgentRemoteStatus;
}
