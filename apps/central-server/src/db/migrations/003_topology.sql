-- Migration 003: Topology links table
CREATE TABLE IF NOT EXISTS topology_links (
  id        TEXT PRIMARY KEY,
  node_a    TEXT NOT NULL,
  node_b    TEXT NOT NULL,
  vlan      INTEGER NOT NULL,
  iface     TEXT NOT NULL,
  ip_a      TEXT NOT NULL,
  ip_b      TEXT NOT NULL,
  status    TEXT DEFAULT 'unknown',
  last_scan INTEGER,
  source    TEXT DEFAULT 'static'
);
