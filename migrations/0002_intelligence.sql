CREATE TABLE IF NOT EXISTS pulse_snapshots (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  as_of TEXT NOT NULL,
  mode TEXT NOT NULL,
  bias TEXT,
  snapshot_json TEXT NOT NULL,
  delta_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS autopilot_events (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pulse_snapshots_schedule ON pulse_snapshots(schedule_id, created_at);
CREATE INDEX IF NOT EXISTS idx_autopilot_events_created ON autopilot_events(created_at);
