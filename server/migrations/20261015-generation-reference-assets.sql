-- BASE #5: private, expiring input assets. No routes or provider transport are enabled.
-- This is an additive migration. Never edit an already checksummed prior migration.
CREATE TABLE IF NOT EXISTS vv_generation_reference_assets (
 id UUID PRIMARY KEY,
 user_id TEXT NOT NULL,
 storage_key TEXT NOT NULL UNIQUE,
 mime TEXT NOT NULL CHECK(mime IN ('video/mp4','audio/wav')),
 byte_size BIGINT NOT NULL CHECK(byte_size>0 AND byte_size<=20971520),
 duration_seconds NUMERIC(10,3) NOT NULL CHECK(duration_seconds>0 AND duration_seconds<=60),
 status TEXT NOT NULL DEFAULT 'uploading'
   CHECK(status IN ('uploading','ready','deleting','failed','deleted')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL,
 uploaded_at TIMESTAMPTZ,
 cleanup_claimed_at TIMESTAMPTZ,
 deleted_at TIMESTAMPTZ,
 last_error TEXT,
 CONSTRAINT vv_generation_reference_expires CHECK(expires_at>created_at)
);
CREATE INDEX IF NOT EXISTS vv_generation_reference_user_idx
 ON vv_generation_reference_assets(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS vv_generation_reference_cleanup_idx
 ON vv_generation_reference_assets(expires_at,status)
 WHERE status<>'deleted';
