CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  source_pi TEXT NOT NULL,
  dest_pi TEXT,
  seq_num INTEGER,
  log_type TEXT,
  payload TEXT,
  received_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_logs_time ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source_pi);
