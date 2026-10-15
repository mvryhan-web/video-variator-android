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


## Future video/audio reference intake — not approved for production

These checks describe a **future** BASE #5 gate; they do not authorize activating it now. The Studio UI and API **do not accept video/audio reference uploads yet**.

1. The existing AI migration manifest includes `20261015-generation-reference-assets.sql`. Back up the database, check migration checksums, and apply only through the existing transactional migration runner in an approved staging environment. Do not hand-edit a previously applied checksum.
2. A separate `vv_generation_reference_assets` ledger tracks owner, UUID, private object key, MIME, byte size, duration, upload state and expiry. The server-only `createGenerationReferenceLedger()` inserts an `uploading` row **before** S3 PUT so an uncertain upload still has a deletion record. The S3 object uses `references/users/<hashed owner>/<UUID>`, not the generated-output directory. No customer-facing or provider URL is returned.
3. All of these must be ready together before even considering private intake: existing `AI_OBJECT_STORAGE_ENABLED=true` with approved private S3 credentials, `AI_STUDIO_REFERENCE_STAGING_ENABLED=true`, `AI_STUDIO_REFERENCE_CLEANUP_ENABLED=true`, an explicitly approved integer `AI_STUDIO_REFERENCE_TTL_MINUTES` (5–1440), and the existing `npm run worker:generation` worker running consistently. **Leave both reference flags FALSE/unset in production for now.**
4. The existing worker includes an optional 10-minute expired-asset sweep. It atomically claims rows with PostgreSQL `FOR UPDATE SKIP LOCKED`, deletes the private object and then deletes the ledger row, with reclaims for abandoned deletions after 15 minutes. A failed object deletion leaves a retryable ledger row. This is not tested with actual production S3 and must not be presented as an SLA.
5. Before any user route or feature-flag activation, separately complete authenticated bounded upload/request limits, full media codec & audio/video stream probing and sanitization, provider-specific duration rules, privacy/retention approval, short-lived provider-fetch transport which does not reveal permanent bucket credentials, historical job attachment and deletion semantics, abuse limits, unit economics and staged end-to-end tests. The current MP4/WAV structural checks alone are insufficient to declare an input safe or compatible.
6. Never manually turn on this subsystem merely because a migration appears applied. Reconfirm rollback, retention sweeper health, orphan cleanup, owner isolation and zero duplicate AI jobs first.

To disable reference intake later, switch `AI_STUDIO_REFERENCE_STAGING_ENABLED=false` (no new uploads), but keep already-staged assets recoverable for deletion under an operator-reviewed cleanup procedure before disabling the cleanup worker. Avoid orphaning customer input by stopping storage/worker prematurely.
