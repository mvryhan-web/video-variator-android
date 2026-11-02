-- DEEPSYQ $0.99 TRIAL — STAGING-ONLY SCHEMA DRAFT.
-- NOT listed in AI_MIGRATION_FILES. DO NOT APPLY TO PRODUCTION.
-- For isolated /vv_ai_test Postgres integration tests only; NEVER auto-run in a request.
-- No wallet/credits/authed access/Stripe calls are added here.
--
-- Hard stop until owner approval of actual credit count/expiry/refund economics,
-- real Stripe signed webhook handling, idempotent ledger sync and commercial terms.
CREATE TABLE IF NOT EXISTS vv_ai_trial_purchase_staging (
  user_id TEXT PRIMARY KEY CHECK (length(user_id) BETWEEN 1 AND 200),
  payment_identity_digest TEXT NOT NULL UNIQUE
    CHECK (payment_identity_digest ~ '^[a-f0-9]{64}$'),
  stripe_session_id TEXT NOT NULL UNIQUE
    CHECK (stripe_session_id LIKE 'cs_%' AND length(stripe_session_id) BETWEEN 6 AND 200),
  stripe_payment_intent_id TEXT NOT NULL UNIQUE
    CHECK (stripe_payment_intent_id LIKE 'pi_%' AND length(stripe_payment_intent_id) BETWEEN 6 AND 200),
  amount_cents INTEGER NOT NULL DEFAULT 99 CHECK (amount_cents = 99),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  checkout_mode TEXT NOT NULL DEFAULT 'payment' CHECK (checkout_mode = 'payment'),
  one_time BOOLEAN NOT NULL DEFAULT TRUE CHECK (one_time),
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE CHECK (NOT auto_renew),
  verified_payment_at_ms BIGINT NOT NULL CHECK (verified_payment_at_ms >= 0 AND verified_payment_at_ms < 8600000000000000),
  expires_at_ms BIGINT NOT NULL CHECK (expires_at_ms = verified_payment_at_ms + 259200000),
  refunded_cents INTEGER NOT NULL DEFAULT 0 CHECK (refunded_cents BETWEEN 0 AND 99),
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vv_ai_trial_staging_expiry_idx
  ON vv_ai_trial_purchase_staging (expires_at_ms, revoked);
