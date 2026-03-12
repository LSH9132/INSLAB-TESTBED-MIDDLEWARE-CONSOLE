import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import type { PiNode, PiCreateRequest, PiAuthMethod } from '@inslab/shared';

interface PiNodeRow {
  id: string;
  name: string;
  ip: string;
  ssh_port: number;
  ssh_user: string;
  auth_method: PiAuthMethod | null;
  ssh_password: string | null;
  ssh_private_key: string | null;
  net_agent_sample_interval_sec: number | null;
  status: PiNode['status'];
  last_seen: number | null;
  created_at: number;
}

interface IdRow {
  id: string;
}

export function getAllPis(): PiNode[] {
  const rows = getDb().prepare('SELECT * FROM pi_nodes ORDER BY created_at').all() as PiNodeRow[];
  return rows.map(rowToPiNode);
}

export function getPiById(id: string): PiNode | undefined {
  const row = getDb().prepare('SELECT * FROM pi_nodes WHERE id = ?').get(id) as PiNodeRow | undefined;
  return row ? rowToPiNode(row) : undefined;
}

export function checkDuplicateName(name: string): boolean {
  const row = getDb().prepare('SELECT id FROM pi_nodes WHERE name = ?').get(name) as IdRow | undefined;
  return !!row;
}

export function checkDuplicateIp(ip: string): boolean {
  const row = getDb().prepare('SELECT id FROM pi_nodes WHERE ip = ?').get(ip) as IdRow | undefined;
  return !!row;
}

export function createPi(req: PiCreateRequest): PiNode {
  const id = uuid();

  getDb().prepare(`
    INSERT INTO pi_nodes (id, name, ip, ssh_port, ssh_user, auth_method, ssh_password, ssh_private_key, net_agent_sample_interval_sec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.name,
    req.ip,
    req.sshPort ?? 22,
    req.sshUser ?? 'pi',
    req.authMethod ?? 'key',
    req.sshPassword ?? null,
    req.sshPrivateKey ?? null,
    req.netAgentSampleIntervalSec ?? 5,
  );

  return getPiById(id)!;
}

export function updatePi(id: string, req: Partial<PiCreateRequest>): PiNode | undefined {
  const existing = getPiById(id);
  if (!existing) return undefined;

  const updates: string[] = [];
  const params: Array<string | number | null> = [];

  if (req.name !== undefined) {
    updates.push('name = ?');
    params.push(req.name);
  }
  if (req.ip !== undefined) {
    updates.push('ip = ?');
    params.push(req.ip);
  }
  if (req.sshPort !== undefined) {
    updates.push('ssh_port = ?');
    params.push(req.sshPort);
  }
  if (req.sshUser !== undefined) {
    updates.push('ssh_user = ?');
    params.push(req.sshUser);
  }
  if (req.authMethod !== undefined) {
    updates.push('auth_method = ?');
    params.push(req.authMethod);
  }
  if (req.sshPassword !== undefined) {
    updates.push('ssh_password = ?');
    params.push(req.sshPassword);
  }
  if (req.sshPrivateKey !== undefined) {
    updates.push('ssh_private_key = ?');
    params.push(req.sshPrivateKey);
  }
  if (req.netAgentSampleIntervalSec !== undefined) {
    updates.push('net_agent_sample_interval_sec = ?');
    params.push(req.netAgentSampleIntervalSec);
  }

  if (updates.length > 0) {
    params.push(id);
    getDb().prepare(`UPDATE pi_nodes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  return getPiById(id);
}

export function deletePi(id: string): boolean {
  const result = getDb().prepare('DELETE FROM pi_nodes WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updatePiStatus(id: string, status: string) {
  getDb().prepare('UPDATE pi_nodes SET status = ?, last_seen = unixepoch() WHERE id = ?').run(status, id);
}

function rowToPiNode(row: PiNodeRow): PiNode {
  return {
    id: row.id,
    name: row.name,
    ip: row.ip,
    sshPort: row.ssh_port,
    sshUser: row.ssh_user,
    authMethod: (row.auth_method ?? 'key') as PiAuthMethod,
    sshPassword: row.ssh_password ?? null,
    sshPrivateKey: row.ssh_private_key ?? null,
    netAgentSampleIntervalSec: row.net_agent_sample_interval_sec ?? 5,
    status: row.status,
    lastSeen: row.last_seen,
    createdAt: row.created_at,
  };
}
