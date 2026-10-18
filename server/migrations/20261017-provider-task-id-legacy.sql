-- Append-only upgrade for older vv_generation_jobs deployments.
-- NEVER edit the checksum-tracked 20261015-generation-jobs.sql migration.
-- A fresh install has this generated column already; IF NOT EXISTS is harmless.
-- A recorded 20261015 migration on an older table may lack this field.
-- Only run after verified schema backup and isolated migration acceptance.
ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS provider_task_id TEXT GENERATED ALWAYS AS (
  CASE
    WHEN operation LIKE 'byteplus:%' THEN substring(operation FROM 10)
    ELSE operation
  END
) STORED;

-- ADD COLUMN IF NOT EXISTS does not validate a pre-existing column. Refuse
-- unsafe schemas where that name is a normal/wrong-typed column, rather than
-- silently treating untrusted task IDs as generated audit provenance.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    WHERE a.attrelid = 'vv_generation_jobs'::regclass
      AND a.attname = 'provider_task_id'
      AND NOT a.attisdropped
      AND (a.attgenerated <> 's' OR a.atttypid <> 'text'::regtype)
  ) THEN
    RAISE EXCEPTION 'GENERATION_PROVIDER_TASK_COLUMN_CONFLICT';
  END IF;
END $$;

-- CREATE INDEX IF NOT EXISTS in the original migration was only run for the
-- schema that existed on its first application. Fill the legacy index gap.
CREATE INDEX IF NOT EXISTS vv_generation_jobs_provider_task_idx
  ON vv_generation_jobs(provider,provider_task_id)
  WHERE provider_task_id IS NOT NULL;
