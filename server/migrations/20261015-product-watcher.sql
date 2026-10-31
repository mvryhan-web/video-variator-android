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

-- Only an actually running private worker updates this heartbeat; no fake online flag.
CREATE TABLE IF NOT EXISTS vv_product_watcher_scheduler (
  id INTEGER PRIMARY KEY CHECK(id=1),
  heartbeat_at TIMESTAMPTZ
);
INSERT INTO vv_product_watcher_scheduler(id) VALUES(1) ON CONFLICT(id) DO NOTHING;


-- Owner review queue. Observations are deduplicated, with no automatic remediations.
CREATE TABLE IF NOT EXISTS vv_product_watcher_alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fingerprint CHAR(64) NOT NULL UNIQUE,
  source TEXT NOT NULL,
  code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('warning','critical')),
  provider TEXT,
  currency TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  observations INTEGER NOT NULL DEFAULT 1,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT
);
CREATE INDEX IF NOT EXISTS vv_product_watcher_alerts_seen_idx
  ON vv_product_watcher_alerts(last_seen_at DESC);


-- Optional, additive only. Existing main migration manifest remains unchanged.
-- Snapshots keep hashes and official URLs, NEVER page content or credentials.
CREATE TABLE IF NOT EXISTS vv_product_watcher_official_sources (
  source_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  source_url TEXT NOT NULL,
  content_hash CHAR(64),
  topic_digests JSONB,
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error_code TEXT
);
ALTER TABLE vv_product_watcher_official_sources ADD COLUMN IF NOT EXISTS topic_digests JSONB;

CREATE TABLE IF NOT EXISTS vv_product_watcher_proposals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key TEXT NOT NULL REFERENCES vv_product_watcher_official_sources(source_key),
  provider TEXT NOT NULL,
  source_url TEXT NOT NULL,
  previous_hash CHAR(64) NOT NULL,
  current_hash CHAR(64) NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','reviewed','dismissed')),
  possible_topics TEXT[] NOT NULL DEFAULT '{}',
  topics_compared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  UNIQUE(source_key,current_hash)
);
ALTER TABLE vv_product_watcher_proposals ADD COLUMN IF NOT EXISTS possible_topics TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE vv_product_watcher_proposals ADD COLUMN IF NOT EXISTS topics_compared BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS vv_product_watcher_proposals_status_idx
  ON vv_product_watcher_proposals(review_status,created_at DESC);


-- Owner-only deterministic reports. No outbound delivery is configured by this schema.
CREATE TABLE IF NOT EXISTS vv_product_watcher_briefs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('daily','weekly')),
  period_key CHAR(10) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kind,period_key)
);
CREATE INDEX IF NOT EXISTS vv_product_watcher_briefs_created_idx ON vv_product_watcher_briefs(created_at DESC);


-- Daily owner-only content diagnostics and internal opportunity notes.
CREATE TABLE IF NOT EXISTS vv_product_watcher_content_tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('content','opportunities')),
  period_key CHAR(10) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(kind,period_key)
);
CREATE INDEX IF NOT EXISTS vv_product_watcher_content_created_idx
  ON vv_product_watcher_content_tasks(created_at DESC);


-- Exactly once attempt per alert/channel; unknown deliveries stay pending owner review.
CREATE TABLE IF NOT EXISTS vv_product_watcher_notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES vv_product_watcher_alerts(id),
  channel TEXT NOT NULL CHECK(channel='telegram'),
  status TEXT NOT NULL CHECK(status IN ('sending','sent','delivery_unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  UNIQUE(alert_id,channel)
);
CREATE INDEX IF NOT EXISTS vv_product_watcher_notifications_created_idx
  ON vv_product_watcher_notifications(created_at DESC);
