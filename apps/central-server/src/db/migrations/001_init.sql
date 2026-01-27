CREATE TABLE IF NOT EXISTS pi_nodes (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  ip_management TEXT NOT NULL,
  ip_ring TEXT NOT NULL,
  ssh_port INTEGER DEFAULT 22,
  ssh_user TEXT DEFAULT 'pi',
  ring_position INTEGER,
  status TEXT DEFAULT 'unknown',
  last_seen INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);
