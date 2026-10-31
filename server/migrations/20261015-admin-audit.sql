CREATE TABLE IF NOT EXISTS vv_admin_audit(
  id BIGSERIAL PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vv_admin_audit_created_idx ON vv_admin_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS vv_admin_audit_target_idx ON vv_admin_audit(target_type,target_id,created_at DESC);
