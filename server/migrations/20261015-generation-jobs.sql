CREATE TABLE IF NOT EXISTS vv_generation_pilot(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  operation TEXT,
  mime TEXT,
  media BYTEA,
  result_text TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS credits_reserved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS credits_charged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(14,6);
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(14,6);
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE vv_generation_pilot ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS vv_generation_pilot_user_created_idx
  ON vv_generation_pilot(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS vv_generation_pilot_user_status_idx
  ON vv_generation_pilot(user_id,status);
