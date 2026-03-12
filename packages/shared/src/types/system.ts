export interface SystemStatus {
  centralServer: ServiceStatus;
  logServer: ServiceStatus;
  database: ServiceStatus;
}

export interface ServiceStatus {
  status: 'online' | 'offline' | 'degraded';
  uptime?: number;
  message?: string;
  lastChecked?: number;
}

export interface NetworkCollectionSettings {
  pollIntervalSec: number;
  freshnessSec: number;
}
