-- Additive, repeatable migration reused from PR28. Existing user rights and video usage remain unchanged.
ALTER TABLE vv_users ADD COLUMN IF NOT EXISTS tools_trial_used INTEGER NOT NULL DEFAULT 0 CHECK (tools_trial_used >= 0);
 CREATE TABLE IF NOT EXISTS vv_tool_runs (
 id UUID PRIMARY KEY,user_id TEXT NOT NULL REFERENCES vv_users(id) ON DELETE CASCADE,tool TEXT NOT NULL,
 trial_reserved BOOLEAN NOT NULL,state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','completed','canceled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ NOT NULL,finished_at TIMESTAMPTZ);
 CREATE INDEX IF NOT EXISTS vv_tool_runs_user_state_idx ON vv_tool_runs(user_id,state,expires_at);
