CREATE TABLE IF NOT EXISTS vv_generation_jobs(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  type TEXT GENERATED ALWAYS AS (kind) STORED,
  status TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  provider_task_id TEXT GENERATED ALWAYS AS (
    CASE
      WHEN operation LIKE 'byteplus:%' THEN substring(operation FROM 10)
      ELSE operation
    END
  ) STORED,
  operation TEXT,
  prompt TEXT,
  client_request_id TEXT,
  request_fingerprint TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  mime TEXT,
  media BYTEA,
  result_text TEXT,
  error TEXT,
  error_code TEXT GENERATED ALWAYS AS (error) STORED,
  error_message TEXT,
  estimated_cost NUMERIC(14,6),
  actual_cost NUMERIC(14,6),
  cost_currency TEXT CHECK(cost_currency IS NULL OR cost_currency ~ '^[a-z]{3}$'),
  credits_reserved INTEGER NOT NULL DEFAULT 0,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  last_polled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS operation TEXT;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS client_request_id TEXT;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMPTZ;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS credits_reserved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS credits_charged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(14,6);
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(14,6);
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS cost_currency TEXT CHECK(cost_currency IS NULL OR cost_currency ~ '^[a-z]{3}$');
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS input_assets JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS output_assets JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF to_regclass('public.vv_generation_pilot') IS NOT NULL THEN
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
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.vv_generation_pilot') IS NOT NULL THEN
    INSERT INTO vv_generation_jobs(
      id,user_id,kind,status,provider,model,operation,prompt,settings,
      mime,media,result_text,error,estimated_cost,actual_cost,
      credits_reserved,credits_charged,created_at,started_at,completed_at,failed_at,metadata,deleted
    )
    SELECT
      id,user_id,kind,status,provider,model,operation,COALESCE(prompt,''),COALESCE(settings,'{}'::jsonb),
      mime,media,result_text,error,estimated_cost,actual_cost,
      COALESCE(credits_reserved,0),COALESCE(credits_charged,0),created_at,started_at,completed_at,failed_at,
      COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('migratedFrom','vv_generation_pilot'),deleted
    FROM vv_generation_pilot
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS vv_generation_jobs_user_created_idx
  ON vv_generation_jobs(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS vv_generation_jobs_user_status_idx
  ON vv_generation_jobs(user_id,status);
CREATE INDEX IF NOT EXISTS vv_generation_jobs_provider_status_idx
  ON vv_generation_jobs(provider,status);
CREATE INDEX IF NOT EXISTS vv_generation_jobs_provider_task_idx
  ON vv_generation_jobs(provider,provider_task_id)
  WHERE provider_task_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vv_generation_jobs_user_request_uidx ON vv_generation_jobs(user_id,client_request_id) WHERE client_request_id IS NOT NULL;
