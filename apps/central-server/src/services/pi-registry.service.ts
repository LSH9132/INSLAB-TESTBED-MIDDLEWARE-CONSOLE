import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import type { PiNode, PiCreateRequest } from '@inslab/shared';

export function getAllPis(): PiNode[] {
  const rows = getDb().prepare('SELECT * FROM pi_nodes ORDER BY ring_position').all() as any[];
  return rows.map(rowToPiNode);
}

export function getPiById(id: string): PiNode | undefined {
  const row = getDb().prepare('SELECT * FROM pi_nodes WHERE id = ?').get(id) as any;
  return row ? rowToPiNode(row) : undefined;
}

export function checkDuplicateHostname(hostname: string): boolean {
  const row = getDb().prepare('SELECT id FROM pi_nodes WHERE hostname = ?').get(hostname) as any;
  return !!row;
}

export function checkDuplicateIp(ip: string): boolean {
  const row = getDb().prepare('SELECT id FROM pi_nodes WHERE ip_management = ? OR ip_ring = ?').get(ip, ip) as any;
  return !!row;
}

export function createPi(req: PiCreateRequest): PiNode {
  const id = uuid();
  const maxPos = getDb().prepare('SELECT MAX(ring_position) as m FROM pi_nodes').get() as any;
  const nextPos = (maxPos?.m ?? -1) + 1;

  getDb().prepare(`
    INSERT INTO pi_nodes (id, hostname, ip_management, ip_ring, ssh_port, ssh_user, ring_position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.hostname, req.ipManagement, req.ipRing, req.sshPort ?? 22, req.sshUser ?? 'pi', nextPos);

  return getPiById(id)!;
}

export function deletePi(id: string): boolean {
  const result = getDb().prepare('DELETE FROM pi_nodes WHERE id = ?').run(id);
  if (result.changes > 0) {
    reorderRingPositions();
    return true;
  }
  return false;
}

export function updatePiStatus(id: string, status: string) {
  getDb().prepare('UPDATE pi_nodes SET status = ?, last_seen = unixepoch() WHERE id = ?').run(status, id);
}

export function reorderRingPositions() {
  const pis = getDb().prepare('SELECT id FROM pi_nodes ORDER BY ring_position').all() as any[];
  const stmt = getDb().prepare('UPDATE pi_nodes SET ring_position = ? WHERE id = ?');
  const tx = getDb().transaction(() => {
    pis.forEach((pi, i) => stmt.run(i, pi.id));
  });
  tx();
}

function rowToPiNode(row: any): PiNode {
  return {
    id: row.id,
    hostname: row.hostname,
    ipManagement: row.ip_management,
    ipRing: row.ip_ring,
    sshPort: row.ssh_port,
    sshUser: row.ssh_user,
    ringPosition: row.ring_position,
    status: row.status,
    lastSeen: row.last_seen,
    createdAt: row.created_at,
  };
}
