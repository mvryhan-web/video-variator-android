# Deepsyq $0.99 / 3-day / no-auto-renew — economic safety gate

ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. ../DECISIONS.md. Прежние расчёты Trial $0.99/кредитов/срока ниже — только ИСТОРИЧЕСКИЕ предположения; никаких условий (длительность, credits, renewal, refunds, anti-abuse) пока не утверждено. Trial не активировать, цены не менять, Issue #182 купленные credits.

Updated 2026-10-15. This is a **READ-ONLY operator analysis**, not a new paid tier or alternate wallet.

## Owners and scope

Owner has approved preparation of a $0.99 USD, three-day, one-time, non-renewing **planned trial**. The number of credits, actual sale, valid period enforcement, anti-abuse policy and final commercial rollout are **not approved**. Preserve the existing main website, original Home screenshots and Videos, Stripe account, Video Uniquifier subscriptions, lifetime entitlements, generation-wallet reservation/capture/refund and provider router. The similarly named `app/src/main/assets/trial-quality.js` belongs to a **different existing Video Uniquifier free trial** and must **not** be used for this AI trial.

**Current Stripe connector visibility:** only test account `MrRyhan` with no test Prices/Products; cannot infer what exists in the actual live account.

## Verified public provider/payment references

- Stripe France pricing (2026-10-15): `https://stripe.com/en-FR/pricing` lists **1.5% + €0.25** for standard EEA cards. UK/international cards and currency conversion can cost more. **Do not add €0.25 directly to a $0.99 price**: calculate actual fees in the sale/settlement currency using the verified Stripe account/contract and FX costs.
- BytePlus official model listing: `https://www.byteplus.com/en/product/modelark/pricing`. Example rate `Seedream 4.5: $0.04/output image`, `Seedream 5 pro: $0.045/output image`. Video generation uses billed video tokens and may vary by model, duration, resolution, input video, draft processing and actual usage.
- BytePlus detailed price/usage documentation: `https://ai.byteplus.com/ark/region:ap-southeast-1/docs/model-pricing`. Use verified real per-job costs and quote dimensions, not just million-token list prices or test fixture amounts.

## Offline cost analysis already implemented

- `scripts/trial-economics-preview.mjs` imports the existing **`server/generation-pricing.js`** validation/registry, works from an explicitly supplied local JSON file, never reads production env and has no network/Stripe/provider/database/ledger access.
- Run `node scripts/trial-economics-preview.mjs /path/to/owner-verified-scenario.json`. **Omitting the JSON file fails closed (exit 2),** rather than fabricating provider costs. The file is **not committed** if it contains commercial/private account data; use a sanitized export.
- Required JSON fields: `salePriceCents:99`, `trialDays:3`, `oneTime:true`, `noAutoRenew:true`, `currency:"usd"`, `processorFixedCents`, `processorBasisPoints`, `taxReserveCents`, `fxReserveCents`, `riskReserveCents`, `minimumProfitCents`, `feesVerifiedInSaleCurrency:true`, and `eligibleRates` (selected explicitly trial-eligible price rows from **existing `AI_MODEL_PRICING_JSON`**).
- All fee/reserve inputs are integer **USD cents**, the provider rows' costs are **USD micros per job**, and provider/model/kind/ratio/quality/mode/duration/credits fields must pass the existing pricing catalog. Currency mismatch, unknown fixed fees, missing provider rate, invalid trial terms, excessive reserves and unaffordable full generations are BLOCKED.
- Processor fee cents = fixed fee + **rounded-up basis-point percentage** of 99 cents. Provider budget = sale cents minus processing fee, tax, FX, risk and required minimum profit reserves.
- The **worst-case per-credit** provider spend among the specifically trial-eligible rows constrains a theoretical credit cap. The analyzer also demands that at least **one entire priced generation** fits; otherwise it returns BLOCKED. Uses integer BigInt arithmetic to avoid floating-point errors and caps at the existing 10,000,000-credit wallet grant limit.
- A successful result is **`SCENARIO_ONLY` and `launchApproved:false`**, never a real credit grant, Checkout price or live API quote. Results must be reviewed with owner before making any product claims.

## Separate release gates that do not yet exist for this trial

1. Verify which provider models will actually be on sale. Real provider availability/cost must match `AI_MODEL_PRICING_JSON` by model/resolution/duration and no nondefault modes may receive implicit fallback pricing.
2. Confirm real Stripe **live** account, one-time `$0.99` Stripe Price and taxes/currency conversion, payment fees per buyer region/card, chargebacks, commission gross margin. Check consumer rights/receipts/disclosures for France/EU and other target markets.
3. Implement three-day **expiry in the existing authentication/entitlement system**. The current AI wallet is a separate prepaid balance and does not by itself expire the trial grant after three days. Do not simply call `GenerationWallet.grantOnce` without timed entitlements.
4. Eligibility/anti-abuse: one entry pass per authorized account/payment identity, webhook event idempotency, account-linking and chargeback/refund revocation. Never grant on Checkout success-page navigation.
5. Respect API credit reservation/capture/release, provider cost tracking, access consent and the real user-facing model quote. Ensure people can see that their trial credits are limited and know what a generation will cost.
6. Verify staging purchases, duplicate webhook processing, refunds and expiry in the **current Stripe/wallet/DB**, after backup. Only then owner may separately approve production/live sale.

## Regression evidence

`.github/workflows/deepsyq-trial-economics.yml` executes `node --test tests/trial-economics-preview.mjs` (5+ fail-closed scenarios) independently of the video team's tests. All example fee/cost inputs inside the tests are **hypothetical, not live provider pricing or official fees**.

**Status: ECONOMICS SCENARIO TOOL IMPLEMENTED, RETAIL CREDIT LIMIT UNDECIDED, LIVE STRIPE/TRIAL EXPIRY/ELIGIBILITY UNIMPLEMENTED, CHECKOUT OFF.**

## Trial time-window and anti-replay policy (pure preview; not live)

As of 2026-10-15, `server/generation-trial-policy.js` provides **pure, exportable but entirely unconnected policy preview functions**. It is not imported by Express routes, auth, provider generation, Stripe handlers or `GenerationWallet`. No feature flag automatically enables it.

- `previewTrialEligibility`: require authenticated account identifier, independently verified account/payment identity, completed authoritative history lookup and zero previous paid trial purchases across **both** account and payment identity. A refund does **not** reset first-time eligibility. This remains a **review hint**, not proof of identity or a successful transactional database lock.
- `previewTrialWindow`: requires a server-verifiable, paid, **one-time** `$0.99 USD` purchase snapshot from a verified webhook, matching Stripe session/payment-intent ids, no subscription renewal, no refund/revocation and valid server clock. Uses a fixed **72 hours elapsed from confirmed payment** (not three arbitrary local calendar days or time since next login), with `now >= paidAt + 259200000` as the hard expiry boundary. Using milliseconds and UTC avoids daylight-saving ambiguity. It always returns `accessGranted:false`, including for an apparently active interval.
- `previewWebhookReplay`: classifies identical existing purchases as replay-ignored, and conflicting user/payment ids, amount or currency as blocked. **It does not enforce database uniqueness or grants**; only a durable transaction with unique constraints and signature-verified webhook may ensure exactly-once real fulfillment.
- Do **NOT** reuse `GenerationWallet.grantOnce` as a three-day trial grant: the ordinary wallet balance has no first-party trial expiry. A live three-day paid trial needs a server-enforced *separate time-bounded entitlement linked to the existing paid wallet*, with a safe strategy for spent, held, unused and refundable credits on expiration.
- Staging DB tests must cover duplicate paid callbacks racing across workers, refunded accounts and payment identities, expiry while a generation is queued/processing, post-expiry retry, payment replays, refund revocation/debt, rollback of a failed transaction and any transferred payment identity. Existing Studio paid quote/consent/provider economic gates remain untouched.
- `tests/generation-trial-policy.mjs` covers nine edge cases, including exact expiry boundary and 2026 autumn daylight-saving transition. The combined `.github/workflows/deepsyq-trial-economics.yml` passed **14/14** offline Node tests in run `38794538782`. These are test fixtures with no live account/Stripe/provider calls.

**Current readiness:** EXPIRY/ELIGIBILITY/REPLAY RULES TESTED OFFLINE; **NOT INTEGRATED**, **NOT AUTHORIZED FOR REAL MONEY**, **NO CREDITS ISSUED**. Do not enable the paid trial on a successful dry run alone.
