# Deepsyq AI Production Rollout

This runbook applies to the existing production project. It does **not** authorize a launch by itself.

## Non-negotiable order

1. **Keep public/root switches OFF.**
   - `DEEPSYQ_HOME_ENABLED=false`
   - `AI_PUBLIC_GENERATION_ENABLED=false`
   - `AI_BILLING_ENABLED=false`
   - AI Apps/Product Video/Onboarding remain OFF unless individually approved.

2. **Back up production PostgreSQL outside the app process.**
   - Record backup time/location.
   - Do not continue if backup cannot be verified.

3. **Check/apply AI migrations explicitly.**
   - `npm run migrate:ai:check`
   - Review pending migrations.
   - `npm run migrate:ai`
   - Run `npm run migrate:ai:check` again.
   - A checksum mismatch is a hard stop; never rewrite the ledger to hide it.

4. **Configure permanent object storage before commercial generation.**
   - S3-compatible endpoint/bucket/region/access key/secret.
   - Keep credentials server-side.
   - Verify PUT → GET → DELETE with a non-customer fixture.
   - Define and approve retention policy separately; code does not promise one yet.

5. **Configure one provider at a time.**
   - Add only the real provider key/model IDs being tested.
   - For BytePlus video, configure exact approved media CDN hostnames.
   - Keep model/admin/public flags OFF until a controlled owner smoke test.
   - Never auto-retry an ambiguous paid provider submission.

6. **Enter verified provider economics.**
   - Every `AI_MODEL_PRICING_JSON` row used for launch must include explicit `currency`.
   - Enter verified provider cost, credits, ratio/quality/duration constraints.
   - Do not use sample numbers from docs/tests as production prices.

7. **AI wallet + Stripe test mode first.**
   - Configure test Stripe key and test Price IDs.
   - Configure AI credit packs/rates.
   - `AI_BILLING_MODE=test`
   - `AI_BILLING_ENABLED=true`
   - Buy a test pack, verify webhook grant exactly once.
   - Verify duplicate checkout/webhook idempotency.
   - Verify partial/full refund revokes proportional credits and creates debt only when refunded credits were already spent.

8. **Owner generation vertical slice.**
   - Enable owner Studio and approved model(s) only.
   - Enable `AI_STUDIO_WALLET_ENABLED=true`.
   - Run image and video tests.
   - Verify: reserve → provider → durable storage → finalizing → capture.
   - Verify confirmed provider failure releases held credits.
   - Verify ambiguous failure stays in owner billing review.
   - Verify History reopen/download/delete.
   - Verify no duplicate generation from repeated request ID.

9. **Deploy a separate generation worker.**
   - Start command: `npm run worker:generation`.
   - It only resumes existing async jobs/finalizing captures; it does not create replacement generations.
   - Confirm graceful restart and that browser + worker polling are throttled.
   - Do not rely on the owner's computer/browser.

10. **Run read-only preflight.**
    - `npm run ai:preflight`
    - Owner Launch Gates must show DB/schema/provider/pricing/currency/wallet/credit packs/storage/worker/entitlements ready.
    - Preflight does not migrate or enable anything.

11. **Live Stripe is a separate explicit gate.**
    - Switch to live Price IDs/key.
    - `AI_BILLING_MODE=live`
    - `AI_LIVE_BILLING_APPROVED=true`
    - `AI_BILLING_ENABLED=true`
    - Perform one controlled real purchase/refund with owner approval.
    - Verify webhook mode, amount, currency, Price ID, payment intent, wallet grant/refund.
    - If any mismatch occurs, turn AI billing OFF first.

12. **Public plan entitlements last.**
    - Populate `AI_PLAN_ENTITLEMENTS_JSON` with approved values.
    - Existing Video Uniquifier Lifetime does **not** imply AI generation entitlement.
    - Confirm per-user concurrency/hourly limits.
    - Only then set `AI_PUBLIC_GENERATION_ENABLED=true`.

13. **Feature rollout.**
    - Enable AI Apps/Product Video/Onboarding individually only after their public acceptance checks.
    - Use owner-approved templates/assets only.
    - Do not seed copied Lumina/BytePlus content.

14. **Root switch is last.**
    - Confirm old Video Uniquifier/Everyday Tools/auth/billing still work.
    - Confirm mobile browser + Android acceptance.
    - Then, and only then, consider `DEEPSYQ_HOME_ENABLED=true`.

## Rollback order

1. Set `AI_PUBLIC_GENERATION_ENABLED=false`.
2. Set `AI_BILLING_ENABLED=false` if payment behavior is involved.
3. Disable affected provider/model in Owner AI Control.
4. Stop the generation worker only after confirming no finalizing jobs require capture/reconciliation.
5. Keep generated data/database intact for investigation; do not destructively roll back schema.
6. Resolve held-credit jobs through the audited owner billing-review flow.
7. Re-enable only after the exact failure is understood and tested.

## External gates that code cannot complete by itself

- real BytePlus/Google API account activation and keys;
- verified current provider prices/terms;
- real S3-compatible bucket/credentials/retention policy;
- production DB backup confirmation;
- live Stripe Products/Prices/webhook endpoint and controlled real payment/refund;
- Render worker creation/startup and production env values;
- physical Android/iPhone acceptance;
- legal Terms/Privacy/provider disclosures;
- final root/public launch approval.


## Interpreting the read-only preflight report

`verificationScope=configuration-and-migration-ledger` means the command checked local configuration and the recorded migration checksums only. Even `launchReady=true` is not evidence of a successful provider request, storage roundtrip, running worker, Stripe purchase/refund or phone acceptance; the report lists these under `externalVerificationRequired`. Keep the external gates above.

Exit codes: `0` configuration/ledger checks pass; `2` missing configuration or pending/drifted/empty migration ledger; `3` check/cleanup failure. Database connections and queries have bounded timeouts. Errors use stable generic codes and never print database driver messages or connection strings. Diagnose failures through access-controlled infrastructure logs, not by adding secrets to this report. This command never applies migrations.
