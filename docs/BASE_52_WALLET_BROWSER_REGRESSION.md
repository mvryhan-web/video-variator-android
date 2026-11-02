# BASE #52 — Studio wallet browser regression after BASE #13

Original §52 stage 20 requires regression testing prior to production release; it does NOT authorize skipping provider/backup/Stripe gates or merging the draft PR #42 into main.

**Observed verified CI failure:** [AI Studio preview run 38911706547](https://github.com/mvryhan-web/video-variator-android/actions/runs/38911706547) failed several Chrome/Firefox/WebKit wallet UI fixtures that expected balances like 120/850 but received the dash fallback. The test still mocked `/api/ai-billing/balance` and `/api/ai-billing/history`; since merged [BASE #13 PR #96](https://github.com/mvryhan-web/video-variator-android/pull/96), Studio correctly requests `/api/ai-wallet/balance` and `/api/ai-wallet/history` even if pack sales are off. This was a **stale test fixture**, not evidence that the immutable ledger lost customer funds.

**Scope:** change only two stale balance mocks and one history mock in `tests/generation-studio.spec.mjs`. Add a distinct wallet-ready/pack-checkout-off browser case which requires positive, correctly parsed wallet balances and ledger movements and zero payment POSTs. It must never fabricate a successful webhook or show buy buttons when checkout is OFF.

Leave app runtime, Stripe webhook, wallet, providers, design, Home, DB and main unchanged. Exact CI proof is required for browser targets; don't claim live Stripe/payment or working paid provider generation from Playwright fixtures.

This stage can be marked **scoped regression PASS**, not complete BASE #52, until backend staging/physical-device, production backup and independent end-to-end real-credits/AI generation checks occur.
