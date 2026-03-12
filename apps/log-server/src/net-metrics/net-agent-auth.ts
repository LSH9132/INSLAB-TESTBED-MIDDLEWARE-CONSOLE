import * as crypto from 'crypto';
import type { NetAgentCompatibilityInfo } from '@inslab/shared';
import { LOG_SERVER_TCP_PORT, NET_AGENT_PROTOCOL_VERSION } from '@inslab/shared';

interface NetAgentTokenPayload {
  nodeId: string;
  protocolVersion: number;
  issuedAt: number;
  expiresAt: number;
}

const SHARED_SECRET = process.env.NET_AGENT_SHARED_SECRET || 'change-me-net-agent-secret';
const PROTOCOL_VERSION = Number(process.env.NET_AGENT_PROTOCOL_VERSION || NET_AGENT_PROTOCOL_VERSION);
const TCP_PORT = Number(process.env.PUBLIC_LOG_SERVER_TCP_PORT || process.env.TCP_PORT || LOG_SERVER_TCP_PORT);
const MIN_AGENT_VERSION = process.env.MIN_NET_AGENT_VERSION || '0.2.0';
const RECOMMENDED_AGENT_VERSION = process.env.RECOMMENDED_NET_AGENT_VERSION || '0.2.0';

function safeParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getNetAgentCompatibilityInfo(): NetAgentCompatibilityInfo {
  return {
    protocolVersion: PROTOCOL_VERSION,
    minAgentVersion: MIN_AGENT_VERSION,
    recommendedAgentVersion: RECOMMENDED_AGENT_VERSION,
    tcpPort: TCP_PORT,
    issuedAt: Date.now(),
  };
}

export function verifyNetAgentToken(token: string, expectedNodeId: string, expectedProtocolVersion: number): boolean {
  const segments = token.split('.');
  if (segments.length !== 2) {
    return false;
  }

  const [payloadSegment, signature] = segments;
  const expectedSignature = crypto
    .createHmac('sha256', SHARED_SECRET)
    .update(payloadSegment)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return false;
  }

  const payloadJson = Buffer.from(payloadSegment, 'base64url').toString('utf8');
  const payload = safeParseJson<NetAgentTokenPayload>(payloadJson);
  if (!payload) {
    return false;
  }

  return (
    payload.nodeId === expectedNodeId &&
    payload.protocolVersion === expectedProtocolVersion &&
    typeof payload.expiresAt === 'number' &&
    payload.expiresAt > Date.now()
  );
}

export function isSupportedProtocolVersion(protocolVersion: number): boolean {
  return protocolVersion === PROTOCOL_VERSION;
}
