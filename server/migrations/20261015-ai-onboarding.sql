CREATE TABLE IF NOT EXISTS vv_ai_onboarding (
  user_id TEXT PRIMARY KEY REFERENCES vv_users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL CHECK(goal IN ('image','video')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
