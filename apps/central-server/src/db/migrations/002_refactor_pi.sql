-- Migration 002: Refactor pi_nodes schema
-- Removes ring topology fields, adds name/ip/authMethod
-- Only runs if old schema still has hostname column

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS pi_nodes_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip TEXT NOT NULL,
  ssh_port INTEGER DEFAULT 22,
  ssh_user TEXT DEFAULT 'pi',
  auth_method TEXT DEFAULT 'key',
  ssh_password TEXT,
  status TEXT DEFAULT 'unknown',
  last_seen INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO pi_nodes_new (id, name, ip, ssh_port, ssh_user, auth_method, status, last_seen, created_at)
SELECT id, hostname, ip_management, ssh_port, ssh_user, 'key', status, last_seen, created_at
FROM pi_nodes
WHERE EXISTS (SELECT 1 FROM pragma_table_info('pi_nodes') WHERE name = 'hostname');

DROP TABLE IF EXISTS pi_nodes;
ALTER TABLE pi_nodes_new RENAME TO pi_nodes;

PRAGMA foreign_keys = ON;
