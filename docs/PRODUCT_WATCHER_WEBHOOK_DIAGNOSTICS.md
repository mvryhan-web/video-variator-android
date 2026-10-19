# Block 5 — Stripe AI webhook configuration diagnostics

**Implemented as code only. Not deployed. No new Stripe endpoint.** Part of the dedicated Product Watcher workstream, deliberately separate from Block 7 and the existing Stripe webhook processing and wallet implementation.

## Actual coverage

When **both** `PRODUCT_WATCHER_ENABLED=true` and `PRODUCT_WATCHER_WEBHOOK_CONFIG_ENABLED=true` are explicitly configured:

- Uses the **existing** `generationBillingRuntime` and `billingCatalog` configuration validation functions in `server/generation-billing.js`. No duplicated billing handler, pricing registry or Stripe client is created.
- If AI credit billing is requested, checks the configured test/live API key mode, presence and syntax of the Stripe webhook signing secret, DB and quote signing secret presence, explicit owner approval for live billing, and whether at least one valid configured AI credit pack exists.
- Produces **only booleans, safe static error codes and pack count**. It never returns the secrets, keys, database address, price IDs, email, customer IDs, requests or raw Stripe events.
- Incorrect AI billing configuration can be flagged **critical** without any real Stripe call. A correctly configured integration is described as `AI_STRIPE_CONFIG_READY_UNVERIFIED` and is **NOT** evidence of successful webhook delivery, payment, AI-credit grant, or signed-event processing.
- If AI credit billing is disabled, it explicitly reports `AI_BILLING_NOT_ACTIVATED` and **does not assess existing legacy subscription payments**, which remain handled by the original billing integration.
- The existing Product Watcher monitor and owner-only UI display results; critical/warning configuration signals are persisted in the same deduplicated alert review queue. The next Daily Brief includes the observed warning through the existing alert counts; no automated repair or refund.

## Explicit limits

This module does **not** perform a test charge, call Stripe, check Stripe event-delivery attempts, verify webhook endpoint reachability from Stripe infrastructure, or prove a message was received and signature-validated. There is no existing reliable delivery-outcome history in the application. A safe and accurate persistent webhook event/outcome journal would require its own reviewed hook in the **existing verified endpoint**, with retention and privacy rules, and should be coordinated with the Block 7 owner.

Do not enable production features or add webhook side effects until the project owner approves the deployment and database continuity, especially given the previously reported 17 October 2026 expiration of the free Render PostgreSQL.

## Tests

Dedicated Node 22 checks assert activation gates, legacy-billing independence, test/live mode mismatch, missing signing secret, empty catalog, no raw secrets, no false Stripe verification. The temporary PostgreSQL acceptance creates an entirely synthetic disabled-signature configuration and confirms that an owner-reviewed critical alert is persisted without any network request or payment action. CI changes are scoped to the Block 5 branch.
