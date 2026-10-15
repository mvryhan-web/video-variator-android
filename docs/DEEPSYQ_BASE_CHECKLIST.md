# DEEPSYQ BASE SPEC CHECKLIST

Source of truth: `docs/DEEPSYQ_PLATFORM_SPEC.md` (the original owner TXT).

Status legend:
- **DONE** — implemented and verified at the current feature-branch level.
- **PARTIAL** — real implementation exists, but the original requirement is not fully met.
- **BLOCKED** — repository work is prepared as far as practical; external credentials/account/service/owner approval is required.
- **NOT STARTED** — no meaningful implementation yet.

This checklist covers only the original BASE/TXT. Roadmap Blocks 1–7 remain separate in `docs/DEEPSYQ_ROADMAP.md`.

| # | Original requirement | Status | Current state / next action |
|---|---|---|---|
| 1 | Product becomes Lumina-style AI creative platform | PARTIAL | Deepsyq dashboard/studios exist on feature branch; public product is not launched. |
| 2 | New AI platform becomes `/` | BLOCKED | `DEEPSYQ_HOME_ENABLED` exists but defaults OFF. Enable only after launch gates pass. |
| 3 | Hero / Canvas workspace | PARTIAL | Studio composer, references, model/settings and examples exist; unified Canvas is not complete. |
| 4 | Image generation | PARTIAL / BLOCKED | Google + BytePlus image adapters prepared; live BytePlus key/model activation and commercial flow pending. |
| 5 | Video generation | PARTIAL / BLOCKED | Google + BytePlus async video adapters prepared; live provider activation/storage/commercial flow pending. |
| 6 | BytePlus first provider adapter | PARTIAL / BLOCKED | Server-only ModelArk adapter exists for Seedream/Seedance. Real account activation/key/smoke call pending. |
| 7 | AI Provider Router | PARTIAL | Shared dispatch/catalog has safe pre-dispatch candidate ordering, normalized model capabilities, owner route preview and config-driven plan access foundation. Live measured reliability/latency routing and broader providers remain incomplete. |
| 8 | Fallback | PARTIAL / SAFETY-GATED | Compatible fallback candidates are ordered before dispatch, but automatic post-dispatch fallback remains intentionally disabled so ambiguous paid calls are never duplicated. |
| 9 | Provider config in admin | PARTIAL | Feature-gated owner API/UI support enable override, maintenance, priority, markup and internal cost, plus a no-spend route preview showing primary/candidate models. |
| 10 | Normal generation-job database entity | PARTIAL | Commercial `vv_generation_jobs` now stores provider/model/prompt/lifecycle/cost/credits/settings/assets/error fields and additively migrates legacy `vv_generation_pilot` rows. Production migration/rollback is still unverified. |
| 11 | Permanent object storage | PARTIAL / BLOCKED | Gated S3-compatible server storage, signed PUT/GET/DELETE and Studio persistence are implemented. Real production bucket/credentials are still required; fallback pilot bytes remain only when storage is disabled. |
| 12 | Background jobs | PARTIAL | Async provider task IDs persist; browser/recovery polling is atomically throttled per job and restart recovery resumes existing tasks without replacement generations. A dedicated production commercial worker/service is still required. |
| 13 | Internal AI credit system | PARTIAL | Separate AI wallet is wired to generation jobs and now appears read-only on the authenticated Dashboard when AI billing is enabled; public entitlements/live economics remain gated. |
| 14 | Credit ledger | PARTIAL | Purchase/reserve/capture/release/refund/debt ledger primitives exist; generation success now captures a prior reservation behind the disabled commercial wallet flag. |
| 15 | Credit reservation | PARTIAL | Generation reserves approved server-priced AI credits before provider execution and captures only after durable output; ambiguous submission errors remain held for review. Feature remains disabled by default. |
| 16 | Stripe subscriptions + credit packs | PARTIAL | Existing Stripe is reused. AI credit-pack checkout supports explicit test/live modes, idempotent grants and cumulative refund synchronization; live Products/Prices/webhook smoke test are still external/unconfigured. |
| 17 | Unit economics | PARTIAL | Job/provider pricing tracks explicit cost currency, credits and provider cost; owner analytics separates currencies and does not fabricate FX/gross margin. Real verified provider economics remain unconfigured. |
| 18 | Pricing engine | PARTIAL | Server-side `AI_MODEL_PRICING_JSON` engine + privacy-preserving Studio credit estimate are wired; estimate sends only kind/model/settings/reference count, never prompt or media. No invented/default prices. |
| 19 | AI Apps | PARTIAL | Separate data-driven AI Apps page now renders only active templates from the shared template API. Use Template prepares a real Image/Video/Audio Studio and never auto-generates; broader workflows remain pending. |
| 20 | Product Video workflow | PARTIAL | Guided local workflow accepts up to 3 product photos + optional logo/name, style/format/duration preference, builds an internal prompt, and hands prompt/settings/local references to Video Studio without auto-generation. Live commercial generation remains gated. |
| 21 | AI Agents | NOT STARTED (BASE) | Deeper implementation is Roadmap Block 2. |
| 22 | Inspiration / Discover | NOT STARTED (BASE) | Full implementation is Roadmap Block 3. |
| 23 | Template system | PARTIAL | Data-driven PostgreSQL template schema/API, owner create/edit/activate/feature/reorder UI, AI Apps catalog and homepage Featured workflows are wired. Final public content still depends on owner-approved templates/assets. |
| 24 | History | PARTIAL | Owner Studio History now has All/Images/Videos/Failed/Processing filters plus Open, Download, Reuse, prepare-only Regenerate and safe Delete. It remains owner-gated; card thumbnails are not yet generated. |
| 25 | My Creations | PARTIAL | User-scoped job access exists; full library/project experience is Roadmap Block 4. |
| 26 | Canvas | PARTIAL | Studio generation workspace exists; richer unified Canvas still incomplete. |
| 27 | Existing Video Uniquifier preserved under Tools | PARTIAL | Existing functionality preserved and linked from Deepsyq; root switch not launched. |
| 28 | Utilities gathered in Tools | PARTIAL | Everyday Tools hub exists; final per-tool allowance policy and some planned utilities remain incomplete. |
| 29 | Final navigation | PARTIAL | Deepsyq dashboard/navigation exists; queued modules are not yet live. |
| 30 | Desktop / Android / iPhone responsive | PARTIAL | Browser/mobile CI exists; physical iPhone/Android acceptance remains outstanding. |
| 31 | Generation UX/status | PARTIAL | Queued/processing/finalizing/ready/failed/unknown states, bounded retry-after polling and localized status/error messages now exist. Full public commercial acceptance UX remains gated. |
| 32 | Friendly error handling | PARTIAL | Central server-side AI error normalization now maps provider capacity/configuration/timeout/output/download/security failures to stable public-safe codes; raw provider text is not exposed. Final public support copy still needs launch review. |
| 33 | Safe retry | PARTIAL | No automatic paid retries on ambiguous failure; recovery only polls existing task IDs, provider polling is throttled, and Generate creation is idempotent via per-user client request IDs/fingerprints. Dedicated commercial worker retry policy is still pending. |
| 34 | Server-side rate/concurrency limits | PARTIAL | Config-driven public plan entitlements can now supply per-user concurrency/hourly limits behind `AI_PUBLIC_GENERATION_ENABLED=false`; no default plan limits are invented. Approved production values remain pending. |
| 35 | Security | PARTIAL | Keys stay server-side; auth/user scoping, safe provider URLs, MIME/signature checks, idempotent generation creation and owner action audit logging exist. Formal launch security review still required. |
| 36 | Privacy | PARTIAL | Added an implementation-accurate AI Media Privacy notice: local Product Video handoff, explicit Studio consent, provider transfer, job metadata storage, object-storage/DB fallback and deletion behavior. Final legal Terms/Privacy and approved automatic retention schedule remain pending. |
| 37 | Business analytics | PARTIAL | Owner overview now shows users/30-day registrations, generation adoption/jobs/failure/latency/top model, recorded provider cost/credits, and confirmed AI-wallet purchases separated by currency. Gross margin stays intentionally blank until live economics/currency are verified. |
| 38 | Admin dashboard | PARTIAL | Owner AI Control includes Users, Generation Jobs, business overview, model controls, route preview, provider metrics, held-credit review, template management, audited credit adjustment and a recent owner action log. Full Stripe payment administration remains pending. |
| 39 | Provider performance | PARTIAL | Owner metrics endpoint aggregates provider/model jobs, success/failure, processing, average time, cost and charged credits. |
| 40 | Model routing registry | PARTIAL | Shared catalog/capabilities plus server-side compatible candidate ordering and owner priorities exist. Logical cross-provider product model IDs and measured quality/reliability routing remain future work. |
| 41 | Internal model capabilities | PARTIAL | All catalog models now expose a normalized capability object for input kinds, output kind, ratios, max references, async mode, quality, duration seconds and reference support. Future provider-specific constraints may extend it. |
| 42 | Persist BytePlus output in our storage | PARTIAL / BLOCKED | Adapter downloads/validates media and Studio can move completed bytes into configured S3-compatible storage before wallet capture. Real storage provisioning and live BytePlus verification remain external gates. |
| 43 | Pricing page | PARTIAL | Pricing separates existing tool subscriptions/Lifetime from AI credits, renders server-configured packs/welcome grant only, and now shows signed-in AI-wallet balance plus recent ledger activity. Final AI economics/pack values still require approval. |
| 44 | Free plan | PARTIAL | Added a config-driven one-time welcome AI-credit grant mechanism with explicit claim, idempotency and debt-first handling. It remains OFF with amount 0 until an exact acquisition allowance is approved. |
| 45 | Onboarding | PARTIAL | New email/Google/Apple accounts are flagged for a persistent Image/Video onboarding choice; selection is stored server-side and routes directly to a real studio. Public launch verification is still pending. |
| 46 | Homepage conversion | PARTIAL | Dashboard uses `Create` + `Explore templates` and now renders up to six real owner-featured workflows from the template API; the section stays hidden when no approved content exists. Public launch still requires owner-approved content/assets. |
| 47 | Do not expose BytePlus as our product | DONE | Provider stays implementation detail; Deepsyq branding used. |
| 48 | Production safety / regression | PARTIAL | Feature flags, owner Launch Gates, read-only preflight, checksummed migrations, idempotency, audit log and staged rollout runbook exist. Production backup/staging/live smoke/physical-device regression are still required. |
| 49 | Database migrations | PARTIAL | Additive AI migrations now have a checksummed transactional runner/ledger plus read-only status/check commands. Production backup and actual migration execution still have not been performed. |
| 50 | Feature flags | PARTIAL | Major Deepsyq/studio/billing gates plus AI Apps, Product Video, Onboarding and owner credit-adjustment flags now exist. New BASE modules default OFF in production unless explicitly enabled. Future roadmap modules still need their own flags. |
| 51 | First commercial vertical slice | PARTIAL | Gated path now supports plan entitlement → idempotent create → approved price → reserve → provider job → throttled async polling → S3/DB persistence → finalizing → capture, plus reconciliation/audit/abuse limits. Live provider/storage/Stripe/margin verification remains incomplete. |
| 52 | Required implementation order | IN PROGRESS | Continue BASE before Roadmap Blocks 1–7. |
| 53 | Explicit non-goals for now | DONE / RULE | No unnecessary marketplace/social network/Photoshop/huge provider sprawl should be built during BASE. |
| 54 | BASE readiness criteria | NOT MET | Cannot mark BASE done until a real new user can buy/get AI credits, generate image/video, leave/return, retrieve result, see correct charge/refund and old tools still work. |
| 55 | Required final report | PENDING | Produce only after BASE verification/deployment gate. |

## Repository work completed in the current continuation

- Added Work-limit efficiency rule to `AGENTS.md`.
- Replaced the pilot job path with commercial `vv_generation_jobs`, including additive migration of legacy pilot rows and broader lifecycle/assets/error/cost/credit fields.
- Extended Studio History/My Results to list durable jobs, reopen results and reuse prompts.
- Added config-driven server-side AI pricing engine with no invented defaults.
- Added safe owner-only generation credit estimate endpoint.
- Added owner-only provider/model performance metrics endpoint.
- Added feature-gated owner model controls for enable/disable, maintenance, priority, markup and internal cost; generation and estimates honor them when enabled.
- Added owner-only AI Control page linked only for admin accounts; no API keys/secrets are exposed.
- Added opt-in restart recovery polling for already-created async provider task IDs; it never creates a replacement generation.
- Added safe server-side smart routing candidate ordering and owner route preview; no automatic fallback is allowed after a provider call may have started.
- Added feature-gated per-user concurrency/hourly generation limits.
- Added S3-compatible object storage with signed server-side PUT/GET/DELETE; generated bytes leave PostgreSQL when storage is enabled.
- Added owner held-credit review/release with explicit job confirmation and audit metadata.
- Added isolated PostgreSQL test for repeatable legacy-pilot → commercial-job migration.
- Wired the existing AI wallet into Studio behind `AI_STUDIO_WALLET_ENABLED=false`: reserve before provider execution, durable `finalizing` state, capture after output persistence, retry capture without regenerating, release on confirmed terminal provider failure, hold ambiguous failures for review.
- Recorded Roadmap Block 7 — Pricing, Credits, Stripe & Unit Economics.
- Added/updated unit and browser test coverage for these changes.

## Repository-safe next tasks

These can be implemented without spending provider credits, but must remain feature-gated:
1. keep automatic post-dispatch fallback disabled until provider idempotency/accepted-task semantics are verified;
2. finish production object-storage provisioning/retention policy once real credentials are available;
3. define public AI entitlements and per-plan concurrency/hourly values after pricing is approved;
4. extend owner analytics from provider/job metrics into revenue/margin/credit-pack reporting after live Stripe AI products exist;
5. build remaining BASE onboarding/template/admin foundations that do not depend on live provider output.

## External / owner / Work-required gates

These cannot be truthfully marked complete from repository code alone:
- accept/complete BytePlus account agreements/profile requirements;
- activate approved BytePlus models and create/store the API key securely;
- verify current live provider pricing and approve Deepsyq credit economics;
- provision production object storage;
- configure required Render secrets/services/background worker;
- configure/verify real AI Stripe Products/Prices and webhook behavior;
- run real paid provider smoke tests;
- run staging database migration/backup and rollback checks;
- verify real Google login and any desired Apple login;
- physical Android/iPhone acceptance;
- controlled production deployment and post-deploy regression.



## Continuation 3 — commercial job + wallet foundation

Current feature-branch code now uses `vv_generation_jobs` rather than the pilot table for Studio reads/writes. The migration is additive and copies legacy pilot rows without deleting the old table. The existing AI wallet is shared with Studio only when `AI_STUDIO_WALLET_ENABLED=true` and approved pricing exists. The default remains OFF. Provider execution cannot start until a reservation succeeds; successful media is first persisted as `finalizing`, then wallet capture is attempted. Recovery may retry only the wallet capture or an existing provider task ID, never a replacement generation. Confirmed terminal provider failures release the reservation; ambiguous submission failures keep the reservation held for owner review. CI for the latest head is running; do not treat this continuation as verified until those checks pass.


## Continuation 4 — routing, storage and safety foundations

Repository-only work now includes:
- safe pre-dispatch Smart routing candidate ordering by owner priority and internal cost; existing default models retain a higher base priority when no override exists;
- owner route preview that never calls a provider;
- no post-dispatch automatic fallback, preserving the no-duplicate-paid-call rule;
- feature-gated per-user concurrent-job and hourly-job limits;
- server-side S3-compatible object storage with signed PUT/GET/DELETE; when configured, generated media is stored there and PostgreSQL keeps output metadata instead of result bytes;
- owner-only held-credit review and explicit release flow for ambiguous failed jobs, with confirmation and audit metadata;
- isolated PostgreSQL migration coverage for repeatable `vv_generation_pilot` → `vv_generation_jobs` migration.

All new commercial switches remain OFF by default. Real bucket credentials, provider keys, live Stripe AI products/prices, production migrations and deployment are still external gates. Latest CI must pass before these changes are treated as verified.


## Continuation 5 — templates and onboarding

- Added `vv_ai_template` with the exact BASE fields: id/title/slug/category/description/thumbnail/generation type/prompt/default model/required inputs/default settings/active/featured/sort order.
- Public template API returns active templates only; owner API/UI supports create, edit, activate, feature and reorder. No invented templates or third-party assets are seeded automatically.
- Added persistent `vv_ai_onboarding` state for Image/Video first-stage workflows.
- New email, Google and Apple account responses identify new accounts; Deepsyq queues onboarding only for those new accounts.
- The onboarding UI routes only to currently real Image/Video studios; Product Ads/Avatar are not falsely presented as completed workflows.
- Added unit/browser coverage for templates and onboarding. Public launch verification is still pending.


## Continuation 6 — History actions

- Added server-whitelisted History filters: All, Images, Videos, Failed and Processing (queued/processing/finalizing).
- History metadata now includes saved generation settings for safe reuse/regenerate preparation.
- Added Download, Reuse, prepare-only Regenerate and safe Delete actions. Regenerate only restores prompt/model/ratio/settings and never starts a paid request automatically.
- Credit usage is visible on History cards. Automatic media thumbnails are intentionally not fetched yet to avoid loading full generated videos/images just to render the list; thumbnail generation remains future work.


## Continuation 7 — AI Apps entry

- Added a separate responsive AI Apps page driven only by active records from the shared template system.
- No example/template cards are hardcoded or invented. An empty active catalog produces an honest empty state.
- Use Template stores a bounded prefill and opens the matching real Studio; Studio consumes the prompt/default model/ratio once and never submits a generation automatically.
- Unsupported active workflow types are shown as pending rather than pretending they work.
- Dashboard CTA now follows the BASE conversion direction: `Create` plus `Explore templates`.


## Continuation 8 — Product Video workflow

- Added a guided Product Video page for product photos, optional logo/name, advertising style, aspect ratio and duration preference.
- Product media is transferred locally through short-lived IndexedDB handoff storage, not uploaded on the workflow page. Video Studio restores only as many references as the selected model supports, keeps consent unchecked and never auto-generates.
- The internal prompt explicitly avoids inventing product features, claims, packaging text or brand details not visible in references.
- Duration remains a creative preference because supported duration is model-specific; unsupported provider parameters are not fabricated.


## Continuation 9 — owner read-only business operations

- Added owner-only read APIs/UI for user plan/status, tool usage, AI-wallet available/held/debt, generation count and confirmed AI-wallet purchase count.
- Added owner job operations table with status/provider/model/duration/recorded cost/credits/errors; media and prompts are deliberately omitted.
- Added business overview for registrations, generation adoption, jobs/failure/latency/top model, recorded provider cost/credits and confirmed AI-wallet purchases grouped by currency.
- Gross margin is deliberately not calculated until provider-cost currency and live AI revenue economics are verified; currencies are never summed together.
- No manual credit mutation or Stripe write/admin action was added in this pass.


## Continuation 10 — audited manual AI credit adjustment

- Added idempotent `owner_adjustment` support to the existing AI wallet with a dedicated audit table containing adjustment ID, target user, owner user, delta and reason.
- Owner adjustment endpoint requires exact target-user confirmation, UUID request ID, non-zero bounded integer delta and reason.
- Negative adjustments cannot exceed currently available AI credits; they cannot silently create debt.
- Feature flag `AI_OWNER_CREDIT_ADJUSTMENTS=false` keeps the capability disabled by default. The operation never changes Stripe.


## Continuation 11 — production-safe BASE feature flags

- Added production-safe flags for AI Apps, Product Video and new-account onboarding. In production, absent flags resolve to OFF; dev/test remains previewable unless explicitly disabled.
- Public template APIs return `AI_APPS_NOT_ENABLED` while AI Apps is disabled; owner template management remains available for preparation.
- Direct `/ai-apps(.html)` and `/product-video(.html)` routes return 404 while disabled, so static-file URLs cannot bypass rollout.
- Dashboard hides disabled module links/cards; onboarding does not interrupt users while its flag is off.


## Continuation 12 — AI media privacy disclosure

- Added a technical AI Media Privacy notice based on current implementation rather than promises: Product Video local handoff, Studio consent, provider transfer, job metadata, generated-result storage and deletion.
- Added cleanup of expired local IndexedDB handoff records whenever the handoff store is next accessed; the notice does not falsely claim a browser background TTL service.
- Explicitly states that no automatic server-side retention period is promised yet and that final legal Terms/Privacy/provider disclosures still require launch review.
- Linked the notice from Studio, Product Video and the Deepsyq footer.


## Continuation 13 — data-driven homepage workflows

- Added a homepage Featured workflows section backed only by active `featured=true` template records.
- No sample cards, prompts or third-party images are invented in code. If the approved featured catalog is empty or AI Apps is disabled, the entire section stays hidden.
- Cards show the owner-provided title/description/thumbnail/category/type and route into the existing AI Apps catalog.


## Continuation 14 — commercial safety foundations

- Added stable public-safe AI error taxonomy; unknown upstream text is reduced to `UNKNOWN` rather than surfaced to users.
- Standardized model capability metadata and made routing/pricing consume the normalized capability fields.
- Added atomic per-job provider polling throttle shared by browser polling and recovery worker to avoid duplicate status requests.
- Added persistent owner audit log for model-control changes, billing-review releases, AI credit adjustments and template create/update actions.
- Added public AI entitlement foundation with no invented defaults. Existing Lifetime access is explicitly not treated as AI entitlement. `AI_PUBLIC_GENERATION_ENABLED=false` remains the gate.
- Added per-user generation request idempotency using UUID request IDs and request fingerprints so the same request cannot start a second paid job.


## Continuation 15 — rollout tooling and live-billing safety

- Added explicit test/live Stripe AI-credit modes. Live requires live mode + live key + `AI_LIVE_BILLING_APPROVED=true` + AI billing enablement.
- Stripe refund webhooks revoke proportional AI credits idempotently; if refunded credits were already spent, wallet debt records the deficit.
- Added Studio AI-wallet/credit-pack checkout UI that stays hidden while AI billing is disabled and validates the Stripe Checkout hostname before navigation.
- Provider costs carry explicit currency; owner analytics never combines currencies or invents FX conversion.
- Added checksummed transactional migration runner, non-mutating migration status, read-only AI preflight and a standalone recovery worker entry point.
- Added `docs/AI_PRODUCTION_ROLLOUT.md` with mandatory activation/rollback order. External production gates remain untouched.


## Continuation 16 — separated Pricing and wallet activity

- Added a dedicated Pricing page that clearly separates existing tool subscriptions/Lifetime from separately metered AI-generation credits. Existing Lifetime is explicitly not presented as unlimited AI.
- AI pack cards render only server-configured credits/amount/currency and cannot start checkout while AI billing is disabled.
- Studio AI wallet now shows recent ledger activity and a manual balance refresh.
- Returning from Stripe never claims payment success; Studio states that credits appear only after the signed Stripe webhook confirms payment.

- Studio error UX now also explains hourly rate limits, concurrent-generation limits and unapproved AI pricing without exposing internal details.


## Continuation 17 — Dashboard AI wallet

- Authenticated Dashboard now shows available AI credits plus held credits or debt when AI billing is actually enabled.
- Wallet UI stays hidden when AI billing is disabled/unavailable and links to the existing separated Pricing page; it never fabricates a balance.


## Continuation 18 — pre-generation credit estimate

- Studio now shows the exact server-configured AI-credit estimate before generation when pricing is configured and the signed-in user is allowed to access the estimate.
- Estimate requests do not transmit prompt text, reference image bytes or consent state; only kind/model/format/music mode/reference count are used.
- Recalculation is debounced and signature-cached so unchanged settings do not repeatedly hit the server. The estimate never starts a provider call.


## Continuation 19 — optional one-time welcome AI credits

- Added `AI_WELCOME_CREDITS_ENABLED=false` + `AI_WELCOME_CREDITS=0`; no free amount is invented or active by default.
- Signed-in users can explicitly claim the configured welcome grant once per account from Pricing when enabled. The grant is idempotent and recorded in the AI ledger.
- If an account has refund debt, the welcome grant pays that debt first instead of bypassing it. Stripe is not involved.
- Added independent `/api/ai-wallet` balance/history/config endpoints so wallet visibility does not depend on payment checkout activation.


## Continuation 20 — Pricing wallet activity

- Signed-in Pricing page now shows AI-wallet Available/Held/Debt and up to ten recent ledger entries.
- Ledger labels cover purchase, welcome grant, reserve, capture, release, refund and owner adjustment without exposing Stripe/payment identifiers or internal secrets.
- Wallet visibility uses the payment-independent `/api/ai-wallet` endpoints and remains separate from existing Video/Everyday Tools credits.
