import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import type { PiNode, PiCreateRequest, PiAuthMethod } from '@inslab/shared';

export function getAllPis(): PiNode[] {
  const rows = getDb().prepare('SELECT * FROM pi_nodes ORDER BY created_at').all() as any[];
  return rows.map(rowToPiNode);
}

export function getPiById(id: string): PiNode | undefined {
  const row = getDb().prepare('SELECT * FROM pi_nodes WHERE id = ?').get(id) as any;
  return row ? rowToPiNode(row) : undefined;
}

export function checkDuplicateName(name: string): boolean {
  const row = getDb().prepare('SELECT id FROM pi_nodes WHERE name = ?').get(name) as any;
  return !!row;
}

export function checkDuplicateIp(ip: string): boolean {
  const row = getDb().prepare('SELECT id FROM pi_nodes WHERE ip = ?').get(ip) as any;
  return !!row;
}

export function createPi(req: PiCreateRequest): PiNode {
  const id = uuid();

  getDb().prepare(`
    INSERT INTO pi_nodes (id, name, ip, ssh_port, ssh_user, auth_method, ssh_password)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.name,
    req.ip,
    req.sshPort ?? 22,
    req.sshUser ?? 'pi',
    req.authMethod ?? 'key',
    req.sshPassword ?? null,
  );

  return getPiById(id)!;
}

export function deletePi(id: string): boolean {
  const result = getDb().prepare('DELETE FROM pi_nodes WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updatePiStatus(id: string, status: string) {
  getDb().prepare('UPDATE pi_nodes SET status = ?, last_seen = unixepoch() WHERE id = ?').run(status, id);
}

function rowToPiNode(row: any): PiNode {
  return {
    id: row.id,
    name: row.name,
    ip: row.ip,
    sshPort: row.ssh_port,
    sshUser: row.ssh_user,
    authMethod: (row.auth_method ?? 'key') as PiAuthMethod,
    status: row.status,
    lastSeen: row.last_seen,
    createdAt: row.created_at,
  };
}
