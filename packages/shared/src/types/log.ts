export interface LogEntry {
  id: number;
  timestamp: number;
  sourcePi: string;
  destPi: string | null;
  seqNum: number | null;
  logType: LogType;
  payload: string;
  receivedAt: number;
}

export type LogType = 'ring_send' | 'ring_recv' | 'system';

export interface LogFilter {
  piId?: string;
  logType?: LogType;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export interface LogIngest {
  timestamp: number;
  piId: string;
  seqNum?: number;
  type: LogType;
  dest?: string;
  payload: string;
}
