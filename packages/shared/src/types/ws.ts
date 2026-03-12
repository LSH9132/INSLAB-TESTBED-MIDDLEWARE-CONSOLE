import type { NetStatsWsMessage } from './net-stats.js';
import type { PiStatus } from './pi.js';

export interface PiStatusWsMessage {
  type: 'pi_status';
  piId: string;
  status: PiStatus;
  timestamp: number;
}

export type AppWsMessage = PiStatusWsMessage | NetStatsWsMessage;
