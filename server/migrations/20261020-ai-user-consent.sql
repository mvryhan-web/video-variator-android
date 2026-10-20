-- Additive, user-scoped, explicitly versioned acceptance. No existing user is silently opted in.
CREATE TABLE IF NOT EXISTS vv_ai_user_consents (
  user_id TEXT PRIMARY KEY REFERENCES vv_users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  provider_data_version TEXT,
  provider_data_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
