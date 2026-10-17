# BASE #14 — internal AI ledger references stay private

The owner original `docs/DEEPSYQ_PLATFORM_SPEC.md` §14 requires a **durable, auditable credit ledger** with transaction/user/amount/reason/job/Stripe reference and timestamp.

The already working PostgreSQL `vv_ai_ledger`, `vv_ai_purchase`, `vv_ai_reservation`, `vv_ai_grant` and `vv_ai_adjustment` are preserved. No new ledger, migrations, balance mutation or payment webhook.

**Identified privacy gap:** `GenerationWallet.history` selected `reference` from the internal ledger and returned all PostgreSQL fields to customer-facing `GET /api/ai-wallet/history` and `GET /api/ai-billing/history`. A purchase reference may contain a Stripe Checkout Session ID, while a reserve/capture reference contains an internal generation job ID. Both existing client wallet interfaces use only the operation kind, date and signed available/reserved/debt deltas — they do **not** need raw internal payment identifiers.

**Scoped fix:** read only `kind,available_delta,reserved_delta,debt_delta,created_at` and serialize through an explicit public allowlist. Internal `reference` and payment details remain in the ledger for idempotency, refund resolution and owner audit. The historical job/media/customer balances, Stripe Checkout routes and approved visual design are unchanged.

Tests assert actual authenticated HTTP responses at BOTH existing customer history URLs hide purchase/session/internal references and still display credit movements, and the wallet method remains user-scoped and SELECT-only. Passing code checks are not proof of live Stripe webhooks, real grants, production migration or full BASE #14 readiness.
