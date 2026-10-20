-- D18: record actual Stripe processor fee/tax/net receipt evidence on the
-- existing AI wallet purchase row. Additive and idempotent; historical rows
-- remain NULL/unverified and cannot fund AI dispatch.
-- This is the existing wallet's canonical purchase table, created here too
-- so the versioned migration runner works before application startup init.
CREATE TABLE IF NOT EXISTS vv_ai_purchase (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  payment_intent TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK(credits>0),
  amount INTEGER NOT NULL CHECK(amount>0),
  currency TEXT NOT NULL,
  refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK(refunded_amount>=0)
);

ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS processor_fee_amount BIGINT;
ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS tax_amount BIGINT;
ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS net_revenue_micros BIGINT;
ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS settlement_verified_at TIMESTAMPTZ;
ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;
ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id TEXT;
ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS settlement_livemode BOOLEAN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vv_ai_purchase_fee_nonnegative') THEN
    ALTER TABLE vv_ai_purchase ADD CONSTRAINT vv_ai_purchase_fee_nonnegative
      CHECK (processor_fee_amount IS NULL OR processor_fee_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vv_ai_purchase_tax_nonnegative') THEN
    ALTER TABLE vv_ai_purchase ADD CONSTRAINT vv_ai_purchase_tax_nonnegative
      CHECK (tax_amount IS NULL OR tax_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vv_ai_purchase_net_revenue_positive') THEN
    ALTER TABLE vv_ai_purchase ADD CONSTRAINT vv_ai_purchase_net_revenue_positive
      CHECK (net_revenue_micros IS NULL OR net_revenue_micros > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vv_ai_purchase_settlement_complete') THEN
    ALTER TABLE vv_ai_purchase ADD CONSTRAINT vv_ai_purchase_settlement_complete CHECK (
      (net_revenue_micros IS NULL AND processor_fee_amount IS NULL AND tax_amount IS NULL AND
       settlement_verified_at IS NULL AND stripe_charge_id IS NULL AND
       stripe_balance_transaction_id IS NULL AND settlement_livemode IS NULL) OR
      (net_revenue_micros IS NOT NULL AND processor_fee_amount IS NOT NULL AND tax_amount IS NOT NULL AND
       settlement_verified_at IS NOT NULL AND stripe_charge_id IS NOT NULL AND
       stripe_balance_transaction_id IS NOT NULL AND settlement_livemode IS NOT NULL AND
       processor_fee_amount>=0 AND tax_amount>=0 AND net_revenue_micros>0 AND
       amount::bigint>processor_fee_amount+tax_amount AND
       net_revenue_micros=(amount::bigint-processor_fee_amount-tax_amount)*10000::bigint));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS vv_ai_purchase_verified_margin
  ON vv_ai_purchase(user_id,currency,settlement_verified_at)
  WHERE settlement_verified_at IS NOT NULL;

-- Signed, cumulatively-applied Stripe refund webhook evidence. Event IDs make
-- duplicate delivery idempotent; the wallet separately stores current refund total.
CREATE TABLE IF NOT EXISTS vv_ai_refund_event (
  event_id TEXT PRIMARY KEY, payment_intent TEXT NOT NULL, stripe_charge_id TEXT NOT NULL,
  cumulative_amount BIGINT NOT NULL CHECK(cumulative_amount>0), livemode BOOLEAN NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS vv_ai_refund_event_payment_intent
  ON vv_ai_refund_event(payment_intent,received_at DESC);

-- Rollback (only after a verified DB snapshot):
-- DROP INDEX IF EXISTS vv_ai_purchase_verified_margin;
-- DROP INDEX IF EXISTS vv_ai_refund_event_payment_intent;
-- DROP TABLE IF EXISTS vv_ai_refund_event;
-- ALTER TABLE vv_ai_purchase DROP CONSTRAINT IF EXISTS vv_ai_purchase_fee_nonnegative;
-- ALTER TABLE vv_ai_purchase DROP CONSTRAINT IF EXISTS vv_ai_purchase_tax_nonnegative;
-- ALTER TABLE vv_ai_purchase DROP CONSTRAINT IF EXISTS vv_ai_purchase_net_revenue_positive;
-- ALTER TABLE vv_ai_purchase DROP CONSTRAINT IF EXISTS vv_ai_purchase_settlement_complete;
-- ALTER TABLE vv_ai_purchase DROP COLUMN IF EXISTS stripe_balance_transaction_id;
-- ALTER TABLE vv_ai_purchase DROP COLUMN IF EXISTS stripe_charge_id;
-- ALTER TABLE vv_ai_purchase DROP COLUMN IF EXISTS settlement_livemode;
-- ALTER TABLE vv_ai_purchase DROP COLUMN IF EXISTS settlement_verified_at;
-- ALTER TABLE vv_ai_purchase DROP COLUMN IF EXISTS net_revenue_micros;
-- ALTER TABLE vv_ai_purchase DROP COLUMN IF EXISTS tax_amount;
-- ALTER TABLE vv_ai_purchase DROP COLUMN IF EXISTS processor_fee_amount;
