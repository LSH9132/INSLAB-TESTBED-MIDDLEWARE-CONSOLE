CREATE TABLE IF NOT EXISTS pi_nodes (
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
