import { CENTRAL_SERVER_PORT, LOG_SERVER_TCP_PORT, NET_AGENT_PROTOCOL_VERSION } from '@inslab/shared';
import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || String(CENTRAL_SERVER_PORT)),
  dbPath: process.env.DB_PATH || './data/central.sqlite',
  sshPrivateKeyPath: process.env.SSH_PRIVATE_KEY_PATH || '~/.ssh/id_rsa',
  logServerUrl: process.env.LOG_SERVER_URL || 'http://localhost:3033',
  netAgentSharedSecret: process.env.NET_AGENT_SHARED_SECRET || 'inslab-net-agent-secret',
  netAgentTokenTtlSec: parseInt(process.env.NET_AGENT_TOKEN_TTL_SEC || '604800', 10),
  publicLogServerHost: process.env.PUBLIC_LOG_SERVER_HOST || '127.0.0.1',
  publicLogServerTcpPort: parseInt(process.env.PUBLIC_LOG_SERVER_TCP_PORT || String(LOG_SERVER_TCP_PORT), 10),
  netAgentProtocolVersion: parseInt(process.env.NET_AGENT_PROTOCOL_VERSION || String(NET_AGENT_PROTOCOL_VERSION), 10),
  minNetAgentVersion: process.env.MIN_NET_AGENT_VERSION || '0.2.0',
  recommendedNetAgentVersion: process.env.RECOMMENDED_NET_AGENT_VERSION || '0.2.0',
  netAgentAssetsDir: process.env.NET_AGENT_ASSETS_DIR || path.resolve(process.cwd(), 'net-agent-assets'),
  netStatsPollIntervalMs: parseInt(process.env.NET_STATS_POLL_INTERVAL_MS || '5000', 10),
  netStatsFreshnessMs: parseInt(process.env.NET_STATS_FRESHNESS_MS || '30000', 10),
  netAgentClockSyncIntervalMs: parseInt(process.env.NET_AGENT_CLOCK_SYNC_INTERVAL_MS || String(15 * 60 * 1000), 10),
};
