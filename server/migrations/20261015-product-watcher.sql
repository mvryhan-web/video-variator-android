-- Block 5 separate, additive migration. Apply only after owner-approved DB backup.
-- Never merge this into BASE migration ledger without coordination.
CREATE TABLE IF NOT EXISTS vv_product_watcher_runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS vv_product_watcher_runs_created_idx ON vv_product_watcher_runs(created_at DESC);

-- Controls are private to the owner and default to paused until an explicit resume.
CREATE TABLE IF NOT EXISTS vv_product_watcher_control (
  id INTEGER PRIMARY KEY CHECK(id=1),
  paused BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);
INSERT INTO vv_product_watcher_control(id, paused) VALUES(1, TRUE)
  ON CONFLICT(id) DO NOTHING;
