-- Owner P0 #182: purchased-only dispatch claims. Additive, no provider calls.
-- Applied only through the existing versioned AI migration runner.
CREATE TABLE IF NOT EXISTS vv_ai_purchased_dispatch_claim (
 job_id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 purchase_reference TEXT NOT NULL,
 credits INTEGER NOT NULL CHECK(credits > 0),
 fingerprint TEXT NOT NULL,
 provider TEXT NOT NULL,
 model TEXT NOT NULL,
 claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vv_ai_purchased_claim_user_idx
 ON vv_ai_purchased_dispatch_claim(user_id,claimed_at DESC);

-- Signed paid subscription invoices have no Checkout session. Track an
-- explicitly verified LIVE invoice independently of pack checkout orders.
-- Only grantPaidSubscriptionInvoice writes this after passing paid invoice,
-- subscription/customer/price and Stripe mode verification.
CREATE TABLE IF NOT EXISTS vv_ai_verified_subscription_invoice (
 invoice_id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 payment_intent TEXT NOT NULL UNIQUE,
 livemode BOOLEAN NOT NULL CHECK(livemode=true),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vv_ai_verified_subscription_user_idx
 ON vv_ai_verified_subscription_invoice(user_id,recorded_at DESC);
