import * as crypto from 'crypto';
import type { NetAgentCompatibilityInfo, NetAgentConfigResponse, PiNode } from '@inslab/shared';
import { LOG_SERVER_TCP_PORT, NET_AGENT_PROTOCOL_VERSION } from '@inslab/shared';
import { config } from '../config.js';

interface NetAgentTokenPayload {
  nodeId: string;
  protocolVersion: number;
  issuedAt: number;
  expiresAt: number;
}

interface LogServerHealthResponse {
  status?: string;
  compatibility?: Partial<NetAgentCompatibilityInfo>;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function signPayload(payload: NetAgentTokenPayload): string {
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', config.netAgentSharedSecret)
    .update(payloadSegment)
    .digest('base64url');

  return `${payloadSegment}.${signature}`;
}

function formatEnvFile(response: Omit<NetAgentConfigResponse, 'envFileContent'>): string {
  return [
    `NODE_ID=${response.nodeId}`,
    `LOG_SERVER_HOST=${response.logServerHost}`,
    `LOG_SERVER_PORT=${response.logServerPort}`,
    `PROTOCOL_VERSION=${response.protocolVersion}`,
    `AUTH_TOKEN=${response.authToken}`,
    `AGENT_VERSION=${response.recommendedAgentVersion}`,
    `SAMPLE_INTERVAL_SEC=${response.sampleIntervalSec}`,
    'SPOOL_PATH=/var/lib/net-agent/spool.ndjson',
    'MAX_SPOOL_BYTES=10485760',
  ].join('\n');
}

async function fetchCompatibility(): Promise<NetAgentCompatibilityInfo> {
  const res = await fetch(new URL('/api/health', config.logServerUrl));
  if (!res.ok) {
    throw new Error(`log-server health request failed with status ${res.status}`);
  }

  const data = (await res.json()) as LogServerHealthResponse;
  const compatibility = data.compatibility;
  if (!compatibility || typeof compatibility.protocolVersion !== 'number') {
    throw new Error('log-server compatibility info is missing');
  }

  return {
    protocolVersion: compatibility.protocolVersion,
    minAgentVersion: compatibility.minAgentVersion || config.minNetAgentVersion,
    recommendedAgentVersion: compatibility.recommendedAgentVersion || config.recommendedNetAgentVersion,
    tcpPort: compatibility.tcpPort || config.publicLogServerTcpPort || LOG_SERVER_TCP_PORT,
    issuedAt: compatibility.issuedAt || Date.now(),
  };
}

export async function buildNetAgentConfig(pi: PiNode): Promise<NetAgentConfigResponse> {
  const compatibility = await fetchCompatibility();
  const protocolVersion = compatibility.protocolVersion || config.netAgentProtocolVersion || NET_AGENT_PROTOCOL_VERSION;
  const issuedAt = Date.now();
  const tokenExpiresAt = issuedAt + (config.netAgentTokenTtlSec * 1000);
  const authToken = signPayload({
    nodeId: pi.id,
    protocolVersion,
    issuedAt,
    expiresAt: tokenExpiresAt,
  });

  const responseBase = {
    nodeId: pi.id,
    protocolVersion,
    minAgentVersion: compatibility.minAgentVersion,
    recommendedAgentVersion: compatibility.recommendedAgentVersion,
    logServerHost: config.publicLogServerHost,
    logServerPort: compatibility.tcpPort,
    sampleIntervalSec: pi.netAgentSampleIntervalSec ?? 5,
    tokenExpiresAt,
    authToken,
  };

  return {
    ...responseBase,
    envFileContent: formatEnvFile(responseBase),
  };
}
