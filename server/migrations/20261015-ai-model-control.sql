CREATE TABLE IF NOT EXISTS vv_ai_model_control (
  model_id TEXT PRIMARY KEY,
  enabled_override BOOLEAN,
  priority INTEGER NOT NULL DEFAULT 100 CHECK(priority BETWEEN 0 AND 10000),
  markup_bps INTEGER CHECK(markup_bps IS NULL OR markup_bps BETWEEN 0 AND 100000),
  internal_cost_micros BIGINT CHECK(internal_cost_micros IS NULL OR internal_cost_micros BETWEEN 0 AND 1000000000000),
  maintenance BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
