# BASE #44 — Free AI acquisition gate (code-only, not a public offer)

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Эта Free AI схема ОТМЕНЕНА решением владельца, архив ниже сохранён только как code-only история, никаких welcome grants/AI Free планов/стартовых credits. Существующие legacy флаги/код НЕ тронуты в этом docs-only задании; необходимо отдельно проверить отключение и исключить публичную рекламу. Канон коммерции Block 7: платный Trial $0.99 НЕ запускать до утверждения срока/кредитов/renewal/refunds/anti-abuse, и Issue #182 purchased-only.


Original owner requirements: `docs/DEEPSYQ_PLATFORM_SPEC.md`, section 44. This is a bounded addition to existing authentication, AI Studio entitlements, price checks and wallet ledger, **not** a new trial/payment architecture.

Default: `AI_FREE_GENERATION_ENABLED=false`. No user-facing credits, charges, model calls or free plan activation occur from this commit.

Explicit, owner-reviewed configuration prerequisite for the **legacy new-account** DB state `plan=trial`, `subscription_status=inactive`, `has_subscribed=false`:

- `AI_PUBLIC_GENERATION_ENABLED=true`: global public Studio rollout gate.
- `AI_STUDIO_WALLET_ENABLED=true`: preserve the existing reserve/settlement requirements. Approved model pricing and configured provider remain mandatory.
- `AI_FREE_GENERATION_ENABLED=true`: extra Free-only opt-in; OFF by default.
- `AI_WELCOME_CREDITS_ENABLED=true`, `AI_WELCOME_CREDITS=<owner-approved integer>`: existing *one-time explicit user claim* endpoint (no automatic grant), 1 to 1000 for this guarded path.
- `AI_PLAN_ENTITLEMENTS_JSON`: add a `trial` record with owner-reviewed `maxConcurrent=1` and `maxPerHour` from 1 to 10. These are hard safety ceilings, **not advertised Free quotas or product prices**.

The existing authenticated AI wallet still rejects generation without enough credits; the existing server-side per-user concurrency/hourly limit is enforced before a paid provider dispatch. An unexpected active/paid status on a legacy `trial` plan is denied, not reclassified into a subscription. Ordinary paid plans continue to require their original active/trialing subscription entitlement. Lifetime is not granted AI access by this flag.

**Remaining launch gates:** approved acquisition budget/quality limits, anti-bot/multi-account abuse, verified costs/currency, production database backup, Stripe/provider staging, owner launch authorization. No promise that real production payment or generation has been checked.

Relevant code-level proof: [BASE #44 Free policy focused CI](https://github.com/mvryhan-web/video-variator-android/actions/runs/38900303386) on the original isolated code SHA, plus fresh CI for this reconciled PR. No `main` or Render changes.
