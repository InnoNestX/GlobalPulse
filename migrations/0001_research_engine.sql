CREATE TABLE IF NOT EXISTS research_runs (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  schedule_name TEXT,
  market TEXT NOT NULL,
  report_type TEXT NOT NULL,
  model TEXT,
  degrade_level TEXT NOT NULL,
  data_quality_json TEXT NOT NULL,
  api_usage_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_evidence (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  source_grade TEXT NOT NULL,
  url TEXT,
  published_at TEXT,
  ticker TEXT,
  used_in_conclusion INTEGER NOT NULL,
  used_reason TEXT,
  verification_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_stock_cards (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  score_total REAL NOT NULL,
  professional_view TEXT NOT NULL,
  short_term_bias TEXT NOT NULL,
  action_level TEXT NOT NULL,
  confidence REAL NOT NULL,
  evidence_count INTEGER NOT NULL,
  source_grade_max TEXT NOT NULL,
  card_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_signals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  macro_score REAL NOT NULL,
  technical_score REAL NOT NULL,
  news_score REAL NOT NULL,
  momentum_score REAL NOT NULL,
  risk_score REAL NOT NULL,
  total_score REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_ai_outputs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  raw_output TEXT,
  parsed_output TEXT,
  is_valid_json INTEGER NOT NULL,
  fallback_used INTEGER NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_data_snapshots (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_outcomes (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  outcome_window TEXT NOT NULL,
  price_at_report REAL,
  price_after_window REAL,
  return_pct REAL,
  max_drawdown_pct REAL,
  max_upside_pct REAL,
  hit_result TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_research_runs_created_at ON research_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_research_evidence_run_id ON research_evidence(run_id);
CREATE INDEX IF NOT EXISTS idx_research_stock_cards_run_id ON research_stock_cards(run_id);
CREATE INDEX IF NOT EXISTS idx_research_outcomes_run_id ON research_outcomes(run_id);

