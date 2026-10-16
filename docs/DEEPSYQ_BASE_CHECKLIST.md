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
| 1 | Product becomes Lumina-style AI creative platform | PARTIAL | Deepsyq dashboard/studios exist on feature branch; dashboard now has prompt-first Image/Video Canvas creation, local PNG/JPG reference previews/drag-drop and a Create / Canvas nav shortcut (no automatic generation). Public product is not launched. |
| 2 | New AI platform becomes `/` | BLOCKED | `DEEPSYQ_HOME_ENABLED` exists but defaults OFF. Enable only after launch gates pass. |
| 3 | Hero / Canvas workspace | PARTIAL | Studio composer, references, model/settings and examples exist; homepage quick-create now passes an editable prompt and up to four locally prepared reference images to Image/Video Studio for review. Three explicitly draft-only prompt starters (product image, social video, editorial portrait) are available, with confirmation before replacing user text. Composer text, Image/Video selection and a model-capability-informed preferred aspect ratio now restore from tab-scoped session storage after refresh, with an explicit confirmed Clear draft; reference photos are not persisted. Preferred ratio is passed via existing local Studio handoff only and is applied there only when the selected model supports it. Unified Canvas remains incomplete; this new change is implemented but deliberately not yet CI-verified at the owner's request. |
| 4 | Image generation | PARTIAL / BLOCKED | Google + BytePlus image adapters prepared. Ready image results in the user's authenticated History now have an Edit image action that securely loads the saved file, prepares it as a local JPG reference and opens the existing Image composer without a second upload or provider request; it preserves the current draft and only suggests the original prompt if the prompt is empty. A ready generated image can also be locally prepared as an Image reference for a manual next edit (JPEG within the existing upload limit; no automatic generation), preserving the existing prompt and reference set when capacity permits, with explicit confirmation before replacing a full set. Studio now also supports adding reference images incrementally and removing them individually, subject to the selected model's limit; changes revoke consent and do not call AI providers. Reference images can also be reordered before submission; any reordering resets consent. Draft-only editing presets (background/lighting/details/style) prepare editable text without generating. Switching models now retains reference photos within the next model's supported limit and asks before dropping excess photos; changing model or format resets explicit consent. Studio example prompts now ask before replacing an existing description and revoke prior generation consent, consistent with Image edit presets. A local per-reference crop editor now supports original/square/portrait/landscape framing, zoom, drag/slider positioning, JPG export under the existing 1 MB limit, and session-only restoration of the original uploaded reference; it never submits a generation or uploads media. The output resolution now travels from the existing Image Studio selector through the server-side capability validator and provider dispatch into saved job settings/History and the pre-generation AI-credit quote. The implemented Google image adapter advertises 1K/2K/4K and forwards the chosen value; the current BytePlus adapter remains pinned to its implemented 2K image dimensions rather than offering unsupported options. Paid upgraded resolutions require an explicitly configured resolution-specific AI pricing row and never silently inherit the old 1K/2K price. Image prompt, selected model, ratio and output resolution now restore from a private, authenticated-session-specific sessionStorage draft (up to 24 hours in the same tab); reference media is intentionally never stored there. On refresh, a saved draft that used references blocks generating until photos are re-added or the user explicitly chooses text-only continuation; a Clear draft action removes current text, settings and attachments without deleting generated history. Oversized PNG/JPG reference uploads up to 16 MB are now resized and re-encoded entirely in the browser to the existing 1 MB server limit before the unchanged image-reference validator; PNG stays PNG (preserving transparency), and failed batches leave previously selected references unchanged. A 48-megapixel dimension safety cap prevents memory-heavy decoding. The original local files are untouched and no AI job or paid upload is started by preparation. This is implemented but still unverified on target browsers. The Image generator now exposes provider-capability-gated output encoding: Seedream 5.0 Lite supports PNG/JPEG selection (server-validated and sent to ModelArk), while models without API format selection retain provider-default output. The chosen format is included in estimate/generate requests, user-scoped job settings/History reuse, handoff and tab-only draft recovery. Alternative output encoding cannot use legacy default-format AI credit prices: it requires an explicitly approved pricing row. This is IMPLEMENTED / UNVERIFIED; provider credentials and real media output have not been tested. A guarded 2–4 image batch workflow is now implemented in the existing Studio as 2–4 **separate** existing single-image jobs (not a fictional multi-output provider call): server-calculated total AI-credit estimate, a single explicit user confirmation, serial submission, distinct job idempotency keys, a per-job expected-credit check before reservation, no automatic retry, and independent History results. It is disabled by default behind `AI_STUDIO_IMAGE_BATCH_ENABLED=true` together with the existing wallet/pricing gates, so it has NOT been activated or verified. BytePlus Seedream 4.5 now exposes 2K/4K, while Seedream 5.0 Lite exposes 2K/3K/4K, mapped to official ratio-specific output dimensions. The existing credit-pricing gate requires explicitly approved per-model quality prices for all non-default resolutions; none have been configured or activated. Checked the native Image API: the connected Google and Seedream variants do not expose a verified native Seed/Negative Prompt control, so the capability catalog marks both unsupported, Studio explains the limitation, and API estimate/create rejects attempts to submit these fields rather than silently ignoring them. Negative directions can be written in the normal prompt, but they are not marketed as a separate provider parameter. This remains IMPLEMENTED / UNVERIFIED. Live BytePlus activation, real batch billing acceptance, verified image responses and pricing, and public commercial completion remain pending. |
| 5 | Video generation | CORE CODE VERIFIED / ADVANCED & LIVE BLOCKED | **CURRENT VERIFIED SCOPE 2026-10-16:** Text→Video and supported Image→Video modes with Veo 3.1 and Seedance 2.0 have implemented adapter, video settings, job/History and mobile editor flows; default Veo `durationSeconds` bug fixed. Scoped final core CI **38892230119** passed **27/27 Node + 44/44 browser**. This is **CODE VERIFIED, not provider-live, deployed or full specification DONE**; owner-approved cloud S3, real provider fetch/billing, MP4/WAV reference upload/dispatch, 4K, cancellation and paid credits remain explicitly blocked. Stop repeating local S3 checks and advance to other independently completable features. Historical implementation details:  Google + BytePlus async video adapters prepared. Video Studio now includes an explicit **Continue in background** action only after a job ID exists: it stops client polling without cancelling the provider task, keeps that same task ID in sessionStorage, opens the video-filtered History, and suppresses stale polling responses. On reload, a deliberately backgrounded job opens History rather than auto-polling; users can explicitly resume/check the same job, without triggering another generation or wallet reservation. Processing video cards in filtered History now include a one-shot **Check status** action that performs only the authenticated existing-job GET and refreshes the card, without starting the long-running browser watcher, creating a job or fetching media; ready videos remain available through explicit Open/Download. A mocked Playwright regression test covers processing → ready and asserts zero paid job POSTs and zero video downloads on status checks; it has not yet been run under the owner's deferred browser-test policy. Terminal Google Veo operation errors now produce a confirmed failed task (rather than a perpetual processing state), with no automatic new provider submission. The browser status check and background recovery share a terminal failure handler: held AI credits are cleared only after the wallet confirms release; a failed settlement keeps the reservation and marks the job for owner billing review. The same handler now covers generated video that cannot be persisted to object storage, replacing the malformed legacy storage-failure update. Isolated mock regression cases were added for failed settlement, confirmed release and storage failure but deliberately not executed until the deferred verification phase. The existing server recovery poller is gated by `AI_STUDIO_BACKGROUND_POLLING=true`; without the approved setting, processing may need a later authenticated History/job check to advance, and recovery over restarts is not claimed. Video Studio now exposes model-specific server-validated duration and resolution selections: Veo 3.1 Lite/Fast supports 4/6/8s at 720p and 8s at 1080p, with image-guided Veo fixed to 8s; Seedance 2.0 offers a safe documented subset of 4/5/8/10/15s and 720p/1080p. Model capabilities populate selectors, the same values are sent to quote/create, passed through existing Google/BytePlus adapters, included in request idempotency, saved per job in History settings and restored for edit-only reuse. The pricing engine refuses to reuse default 720p/duration prices for nondefault combinations; even owner preview cannot dispatch premium video settings without an approved matching pricing entry. Google/BytePlus/unit pricing regression cases were authored, not run under the deferred test policy. Seedance 2.0 now accepts up to **three locally prepared image references** through distinct, mutually exclusive provider roles: text-to-video (0 images), first frame (1 image), first and last frames (exactly 2), and reference-image scene guidance (1–3). This selection is capability-gated in Studio, validated independently in estimate/create and the ModelArk adapter, participates in request idempotency, and is included in job settings. The new premium first-last/reference-image modes require exact explicitly configured `videoInputMode` + `referenceCount` pricing rows, including in owner preview; legacy default prices cannot authorize them. History reuses the text/settings without pretending that previously uploaded reference bytes are still available. Added mock adapter/pricing/browser test cases; not run per deferred verification policy. A backend-only, default-off first stage for external media intake is now present: `server/generation-reference-media.js` strictly rejects unsupported MIME/oversize or structurally invalid video MP4 / PCM WAV input; it extracts bounded container duration, but does **not** claim full codec/provider compatibility. The existing `generation-storage.js` now has private user-scoped staged-reference PUT/GET/DELETE methods, guarded by `AI_STUDIO_REFERENCE_STAGING_ENABLED=true`, with no public provider URL, HTTP upload endpoint, or automatic AI call. An additive checksummed migration (`20261015-generation-reference-assets.sql`) and the existing generation worker now provide an **unactivated** durable reference-asset ledger and expired-object cleanup foundation: per-user asset ID/key/MIME/size/duration/status/expiry, record-before-upload to recover ambiguous S3 PUTs, owner-scoped reads, atomic `SKIP LOCKED` deletion claims, retry of failed deletion and removal of metadata after a successful S3 DELETE. Both `AI_STUDIO_REFERENCE_STAGING_ENABLED=true` and `AI_STUDIO_REFERENCE_CLEANUP_ENABLED=true`, a configured private object store, an active generation worker and an explicit `AI_STUDIO_REFERENCE_TTL_MINUTES` integer between 5 and 1440 are required before the ledger can stage anything; **none has been enabled here**. All staging methods remain server-only with **no HTTP endpoint**, no provider-reachable link, no browser media picker and no AI spend. Mocked ledger regression cases were authored but not yet run. Full codec/malware validation, operational worker/storage acceptance and owner-approved signed provider transport still block actual customer uploads. Source and tests have been added but not executed under the deferred BASE test policy. BytePlus officially supports reference video/audio but the video API requires a provider-reachable video URL, so local video/audio uploads are NOT enabled until private durable storage, secure provider transfer, input validation and billing are ready. Provider-exposed 4K video, video/audio uploads, cancellation and camera options remain disabled pending safe payload/storage/billing support. Video composer text/model/aspect/resolution/duration/reference role now autosave to user-session-scoped sessionStorage for at most 24 hours, using the existing Image draft identity hash. Reference images are intentionally never persisted: after reload any photo-guided video draft is blocked from generating until the exact reference count is reattached and its role restored, or the user explicitly discards missing photos to continue text-only. The Video draft can be cleared without deleting History. Reuse of photo-guided History requires reattaching images rather than silently using unrelated photos; new template/Product Video handoffs supersede stale draft references. Focused browser regression cases were authored for refresh, reattachment, clear and no paid POSTs; they are not yet run. Implementation is UNVERIFIED; real provider activation, persistent provider-storage acceptance, billing, lifecycle/cancel support and commercial flow pending. |
| 6 | BytePlus first provider adapter | PARTIAL / BLOCKED | Server-only ModelArk adapter exists for Seedream/Seedance. Real account activation/key/smoke call pending. |
| 7 | AI Provider Router | PARTIAL | Shared dispatch/catalog has safe pre-dispatch candidate ordering, normalized model capabilities, owner route preview and config-driven plan access foundation. Live measured reliability/latency routing and broader providers remain incomplete. |
| 8 | Fallback | PARTIAL / SAFETY-GATED | Compatible fallback candidates are ordered before dispatch, but automatic post-dispatch fallback remains intentionally disabled so ambiguous paid calls are never duplicated. |
| 9 | Provider config in admin | PARTIAL | Feature-gated owner API/UI support enable override, maintenance, priority, markup and internal cost, plus a no-spend route preview showing primary/candidate models. |
| 10 | Normal generation-job database entity | PARTIAL | Commercial `vv_generation_jobs` now stores provider/model/prompt/lifecycle/cost/credits/settings/assets/error fields and additively migrates legacy `vv_generation_pilot` rows. Production migration/rollback is still unverified. |
| 11 | Permanent object storage | PARTIAL / BLOCKED | Gated S3-compatible server storage, signed PUT/GET/DELETE and Studio persistence are implemented. Real production bucket/credentials are still required; fallback pilot bytes remain only when storage is disabled. |
| 12 | Background jobs | PARTIAL | Async provider task IDs persist; browser/recovery polling is atomically throttled per job and restart recovery resumes existing tasks without replacement generations. A dedicated production commercial worker/service is still required. |
| 13 | Internal AI credit system | PARTIAL | Separate AI wallet is wired to generation jobs and now appears read-only on the authenticated Dashboard when AI billing is enabled; public entitlements/live economics remain gated. **2026-10-16 scoped CODE VERIFIED / MERGED TO BASE:** [PR #96](https://github.com/mvryhan-web/video-variator-android/pull/96), [CI 38908532493](https://github.com/mvryhan-web/video-variator-android/actions/runs/38908532493) PASS. Studio credit wallet now always reads independently of activated Stripe pack checkout and does not invent zero balances from missing data; no Free/Stripe amounts granted. Full BASE #13 still PARTIAL / not production. **Browser regression closed:** [PR #104](https://github.com/mvryhan-web/video-variator-android/pull/104) merged to BASE; [Playwright desktop/mobile CI 38912419194](https://github.com/mvryhan-web/video-variator-android/actions/runs/38912419194) PASS and [Video core 38912155019](https://github.com/mvryhan-web/video-variator-android/actions/runs/38912155019) PASS. Wallet browser mocks now use actual authenticated routes; Stripe OFF wallet remains visible with no checkout. Full BASE #13 still PARTIAL / not deployed. |
| 14 | Credit ledger | PARTIAL — CODE VERIFIED / MERGED TO BASE / NOT LIVE | The existing persistent per-user ledger still records purchase, reserve/capture/release, refunds, owner grants/adjustments and durable internal Stripe/job references, timestamp and deltas. BASE #14 isolated code now narrows the customer `/api/ai-wallet/history` and `/api/ai-billing/history` response to type/date/credit deltas only; raw transaction references remain internal for reconciliation. [PR #90](https://github.com/mvryhan-web/video-variator-android/pull/90) merged, [CI 38906957706](https://github.com/mvryhan-web/video-variator-android/actions/runs/38906957706) successful; authenticated HTTP privacy tested; ledger completeness, real subscription grants, expiry and production Stripe still require their own acceptance. |
| 15 | Credit reservation | PARTIAL — CODE VERIFIED / MERGED TO BASE / NOT LIVE | Existing generation flow reserves server-priced credits before provider execution and captures after durable output; confirmed failure releases once, uncertain status stays held. Isolated Agent D PR adds optional, **trusted-server-only** actual-credit settlement: release the unused reserved portion, repay outstanding debt first, and fail closed on invalid/mismatched retry amounts, using existing reservation + ledger transactions without a migration. Legacy full-reserve capture remains default; no provider usage→credit converter has been invented or deployed. [PR #102](https://github.com/mvryhan-web/video-variator-android/pull/102) merged, [real PostgreSQL CI 38911667162](https://github.com/mvryhan-web/video-variator-android/actions/runs/38911667162) PASS; existing 38911706899 also PASS. Real usage-rated charging remains OFF. |
| 16 | Stripe subscriptions + credit packs | PARTIAL | Existing Stripe is reused. AI credit-pack checkout supports explicit test/live modes, idempotent grants and cumulative refund synchronization; live Products/Prices/webhook smoke test are still external/unconfigured. **2026-10-16 BASE-D scoped code MERGED TO BASE:** [PR #85](https://github.com/mvryhan-web/video-variator-android/pull/85) hardens stored-session Stripe Checkout retries: checks owner, order metadata, exact configured pack/price/currency, test/live mode, open and unexpired HTTPS session; returns correct mode; closed/mismatched sessions fail closed with HTTP 409. [CI 38905166506](https://github.com/mvryhan-web/video-variator-android/actions/runs/38905166506) PASS (new synthetic + existing billing unit regressions). No live Stripe call/production merge; full requirement still PARTIAL until external billing acceptance. **Pricing checkout UI uncertainty follow-up** [PR #86](https://github.com/mvryhan-web/video-variator-android/pull/86) MERGED TO BASE: a 409/uncertain Stripe response no longer tells the customer "No payment was completed"; users are directed to check wallet/payment history or refresh a changed pack. [CI 38905622293](https://github.com/mvryhan-web/video-variator-android/actions/runs/38905622293) PASS. No live charge or main deployment. **2026-10-16 shared signed Stripe webhook safety:** [PR #99](https://github.com/mvryhan-web/video-variator-android/pull/99) MERGED TO BASE; [CI 38909520882](https://github.com/mvryhan-web/video-variator-android/actions/runs/38909520882) PASS. When optional AI billing is OFF, non-AI subscription refunds now pass through shared `/api/webhooks/stripe` without AI code forcing HTTP 500; tagged AI refunds retain mode checks/retry safety. Synthetic tests only, no live Stripe call, BASE #16 still PARTIAL. **Live webhook readiness safeguard:** [PR #106](https://github.com/mvryhan-web/video-variator-android/pull/106) merged to BASE; [CI #38912856318](https://github.com/mvryhan-web/video-variator-android/actions/runs/38912856318) PASS. Live AI launch configuration now blocks absent/malformed Stripe webhook signing secret; actual Stripe signature delivery/payment grant remain externally UNVERIFIED. **Live charge prevention:** [PR #108](https://github.com/mvryhan-web/video-variator-android/pull/108) merged to BASE; [CI #38913883271](https://github.com/mvryhan-web/video-variator-android/actions/runs/38913883271) PASS. Actual AI live Stripe Checkout endpoint is DISABLED without `STRIPE_WEBHOOK_SECRET` even if a live key and approval are configured; sandbox/test remains available. Readiness uses same predicate and reports truthful payment state. Real webhook delivery and Stripe credit purchase/refund tests remain external, BASE #16 PARTIAL / NOT LIVE. |
| 17 | Unit economics | PARTIAL — CODE VERIFIED / MERGED TO BASE / NOT LIVE | Internal provider cost, price and currency records still exist in owner-only business/jobs/metrics APIs, but the original BASE §17 requires customer UI to work in **credits only**. Isolated PR removes provider money fields from authenticated user History list and strips unused cost columns from its SELECT; owner cost accounting persists. Functional HTTP privacy test [CI 38906320339](https://github.com/mvryhan-web/video-variator-android/actions/runs/38906320339) passed; merged PR #89 cd31b923. Actual infrastructure cost, approved provider/FX rates, paid revenue and gross margin remain external/unverified. |
| 18 | Pricing engine | PARTIAL — IN PROGRESS / AMBIGUOUS RATE SAFETY CI PENDING | Existing model/provider-specific pricing and currency-aware server-side credit estimates remain authoritative, with no invented prices. An uncovered risk existed when two different approved pricing rules matched a request with equal specificity (e.g. ratio-only versus quality-only): `estimateGenerationPricing` selected whichever appeared first in JSON, potentially undercharging or overcharging. New isolated Agent D PR changes only ambiguous matching to fail closed (`AI_PRICING_NOT_APPROVED` through existing endpoint), while retaining unique highest-specificity pricing, currency, other provider rates, and ordinary quote flow. Scoped Node tests/CI pending. Actual live provider invoices, markup approval and real production price validation remain BLOCKED. |
| 19 | AI Apps | PARTIAL | Separate data-driven AI Apps page now renders only active templates from the shared template API. Use Template prepares a real Image/Video/Audio Studio and never auto-generates; Product-name placeholders now prefill Studio prompts from user-entered text in verified PR #57, without spending. Owner-approved real template prompt/inputs/settings preview now passed browser CI 38895520013. Broader workflows and real approved content remain pending. In PR #71 (merge `59dea3d3`), the empty/outage catalog now exposes a real guided Product Video route, NOT a fictional active template: users can prepare local references and review a brief manually. Dedicated AI Apps CI 38901487492 passed desktop/mobile Chromium + WebKit; no generation POST. This is CODE VERIFIED in BASE only; owner-approved public templates, rights-backed media, paid provider success and main/production acceptance are still blocked. |
| 20 | Product Video workflow | PARTIAL — REFERENCE ORDER CODE VERIFIED | Guided local workflow accepts up to 3 product photos + optional logo/name, style/format/duration preference, builds an internal prompt, and hands prompt/settings/local references to Video Studio without auto-generation. PR #63 now permits ordering those local photos with accessible controls before handoff, preserves the valid previous photos/logo on bad replacement and displays reference names. GitHub Actions **38899612960 PASS (8/8 desktop/mobile Chromium + WebKit)**; merged to BASE at `b8dc6c18`, NOT to main/production. Duration preference in the creative brief is **not yet applied to the model-native video duration selector**; its Studio consumer belongs to another agent and requires explicit coordination. Model compatibility, owner-paid/provider end-to-end and actual commercial generation remain gated. |
| 21 | AI Agents | NOT STARTED (BASE) | Deeper implementation is Roadmap Block 2. |
| 22 | Inspiration / Discover | NOT STARTED (BASE) | Full implementation is Roadmap Block 3. |
| 23 | Template system | PARTIAL — PRODUCT NAME VALIDATION CODE VERIFIED | Existing data-driven PostgreSQL/API, owner CRUD/reorder/feature, rights basis/notes, published catalogue and Featured workflows remain. PR #88 (merge `8cc09747`) now rejects activating a product_name-required template without {{product_name}} prompt placeholder while preserving drafts and aligning owner readiness to actual AI Apps support. Dedicated Node/PostgreSQL rights CI 38906432334 and readiness CI 38906432137 PASS. Broader AI Studio payment test 38906432469 FAILED in another D-owned checkout workflow; not claimed green. Real owner media rights review, authorized production migration and live provider acceptance still pending. |
| 24 | History | PARTIAL | Studio History has filters plus Open/Download/Reuse/prepare-only Regenerate/Delete, and now lazily previews ready image results through the authenticated media endpoint. Video/audio stay lightweight placeholders. Homepage additionally has a read-only Recent creations list (latest four, signed-in accounts with Studio access only) through the existing user-scoped API. New dashboard integration is not yet tested, per owner direction. It remains gated by generation access. |
| 25 | My Creations | PARTIAL | User-scoped job access exists; the homepage now links recent user-owned Studio jobs to Studio History without a second project store. Full library/project experience is Roadmap Block 4. |
| 26 | Canvas | PARTIAL | Studio generation workspace exists; richer unified Canvas still incomplete. |
| 27 | Existing Video Uniquifier preserved under Tools | PARTIAL | Existing editor now linked both from Deepsyq navigation and within Tools hub (PR #61, desktop/mobile Chromium + WebKit CI 38898789990 PASS). Gentle/Balance/Dynamic editor remains untouched; root switch and live regression/deployment not performed. |
| 28 | Utilities gathered in Tools | PARTIAL — AUDIO & COLLAGE CODE VERIFIED | Everyday Tools and the existing 15 mobile utilities are preserved. Local Audio Trimmer and Video → MP3 have focused CI 38893759236. BASE Photo Collage now implements 2–9 image composition, 2/3-column spacing and background controls, local PNG preview/download, size validation and cleanup (PR #67, merge `cea9c087`, Node + Chromium/WebKit desktop/mobile CI 38900538191 PASS, no uploads or paid AI calls). Overall #28 is still PARTIAL: other utilities, physical device and production acceptance remain outstanding. |
| 29 | Final navigation | PARTIAL — AI APPS HISTORY/CREDITS + ACCOUNT LINKS CODE VERIFIED | Existing navigational links to authenticated Studio My Creations/History and AI Credits/Pricing remain from PR #68. Added real Billing & Settings routes to existing `index.html#profile` and token-clearing Logout (PR #110, merge `89477d7b`); no fake account/billing systems. Browser checks confirmed actual profile controls, no paid API POST and 320/390px navigation on desktop/mobile Chromium+WebKit CI 38915655213 and existing AI Apps regression CI 38915655095 PASS. Home, Stripe, provider, auth backend untouched. Whole-site, real-device and public rollout acceptance still PARTIAL / NOT LIVE. |
| 30 | Desktop / Android / iPhone responsive | PARTIAL — AI APPS MOBILE CODE VERIFIED | AI Apps long title/category metadata now wraps at 320/390px with 44px mobile nav targets (Agent C PR #79, merge `c389045d`, Chromium + WebKit desktop/mobile CI 38904085432 PASS; Agent 5 review). Original Home Quick Create → existing Video Studio handoff tested with zero auto-generation; no owner-locked Home design changed. Physical iPhone/Android, PWA and live overall site acceptance remain unverified. |
| 31 | Generation UX/status | PARTIAL | Queued/processing/finalizing/ready/failed/unknown states, bounded retry-after polling and localized status/error messages now exist. Full public commercial acceptance UX remains gated. |
| 32 | Friendly error handling | PARTIAL | Central server-side AI error normalization now maps provider capacity/configuration/timeout/output/download/security failures to stable public-safe codes; raw provider text is not exposed. Final public support copy still needs launch review. |
| 33 | Safe retry | PARTIAL | No automatic paid retries on ambiguous failure; recovery only polls existing task IDs, provider polling is throttled, and Generate creation is idempotent via per-user client request IDs/fingerprints. Dedicated commercial worker retry policy is still pending. |
| 34 | Server-side rate/concurrency limits | PARTIAL | Config-driven public plan entitlements supply per-user concurrency/hourly limits and Studio can now display the signed-in plan's exact configured limits/reason. No default values are invented; approved production values remain pending. |
| 35 | Security | PARTIAL — TEMPLATE OWNER API ACCESS VERIFIED | Existing server-key isolation, owned jobs/media, signed URL, upload validation, webhook checks and audit logging preserved. Added real disposable PostgreSQL + Express checks for public-only active rights-backed AI templates, no private rights notes, invisible inactive/unverified slugs, owner-only GET/POST/PATCH, anonymous/other provider denial and unchanged rows after forbidden writes (Agent C PR #94, merge `6a3b2d2a`, GitHub Actions 38907935442 PASS). Uses synthetic test auth headers only, not real JWT testing; full IDOR/upload/key/callback/security production audit still required. |
| 36 | Privacy | PARTIAL — WORKER CRASH REDACTION VERIFIED | AI generation worker uncaughtException and unhandledRejection handlers now output only fixed event labels, preserving shutdown without leaking arbitrary error messages (which might contain prompts, media URLs or credentials). Separate privacy CI 38914175144 PASS for PR #109 merge `e89aefc7`. Existing generation/provider/billing logic untouched. This is not full Privacy compliance: media retention, third-party transfers, Terms/Privacy notices and production log audit remain outstanding. |
| 37 | Business analytics | PARTIAL — CODE VERIFIED / BASE MERGED / NOT LIVE | Existing owner overview covers registrations, adoption, failures, latency, top model, per-currency costs and confirmed credit purchases. Branch `base55-d-business-analytics-20261016` adds first successful-generation counts (all-time/30d), confirmed net-positive AI-credit buyer adoption and mean actual cost per priced completed job by currency. Trial→paid, churn, revenue/user and most-used tool remain explicitly unknown. Gross margin stays uncalculated pending live verified economics. |
| 38 | Admin dashboard | PARTIAL — OWNER ADMIN MOBILE CODE VERIFIED | Existing owner Users/Jobs/Models/Credits/Templates/Payments/Metrics/Audit features remain. PR #98 merged `fb9ce2a1`: safe responsive grid for 320px owner model cards and long description wrapping without changing established Admin design. Browser tests on desktop/mobile Chromium and Safari/WebKit at 320/390/1440 pass in CI 38912222509, including zero paid writes and no Admin API calls without login token. Overall #38 still partial; real owner login/security and production/device acceptance gated. |
| 39 | Provider performance | PARTIAL | Owner metrics aggregate provider/model jobs, success/failure rates, processing, average time, cost and charged credits with 24h/7d/30d/all-time windows. Metrics remain observational and do not yet drive routing automatically. |
| 40 | Model routing registry | PARTIAL | Shared catalog/capabilities plus server-side compatible candidate ordering and owner priorities exist. Logical cross-provider product model IDs and measured quality/reliability routing remain future work. |
| 41 | Internal model capabilities | PARTIAL | All catalog models now expose a normalized capability object for input kinds, output kind, ratios, max references, async mode, quality, duration seconds and reference support. Future provider-specific constraints may extend it. |
| 42 | Persist BytePlus output in our storage | PARTIAL / BLOCKED | Adapter downloads/validates media and Studio can move completed bytes into configured S3-compatible storage before wallet capture. Real storage provisioning and live BytePlus verification remain external gates. |
| 43 | Pricing page | PARTIAL | Pricing separates existing tool subscriptions/Lifetime from AI credits, renders server-configured packs/welcome grant only, and now shows signed-in AI-wallet balance plus recent ledger activity. Final AI economics/pack values still require approval. |
| 44 | Free plan | PARTIAL — CODE VERIFIED / BASE MERGED / NOT LIVE | One-time optional AI welcome grant remains OFF/0, and BASE #44 Free AI entitlement is now implemented, OFF by default, with strict existing wallet, owner pricing and rate limits. PR #70 merged into BASE (222196f8); Free policy CI 38900866559 and broader Studio CI 38900866789 PASS. Draft PR #65 contains identical feature/test/workflow blobs and must not be merged again (Issue #75 review). Exact free credits, abuse safety, public provider economics and live acceptance are unapproved; NOT full DONE. |
| 45 | Onboarding | PARTIAL | New email/Google/Apple accounts are flagged for a persistent Image/Video onboarding choice; selection is stored server-side and routes directly to a real studio. Public launch verification is still pending. |
| 46 | Homepage conversion | PARTIAL | Dashboard uses `Create` + `Explore templates` and renders up to six real owner-featured workflows from the template API in a restored, responsive section; it remains hidden without approved active content. Public launch still requires owner-approved content/assets. |
| 47 | Do not expose BytePlus as our product | DONE | Provider stays implementation detail; Deepsyq branding used. |
| 48 | Production safety / regression | PARTIAL | Feature flags, owner Launch Gates, read-only preflight, checksummed migrations, idempotency, audit log and staged rollout runbook exist. Production backup/staging/live smoke/physical-device regression are still required. |
| 49 | Database migrations | PARTIAL | Additive AI migrations now have a checksummed transactional runner/ledger plus read-only status/check commands. Production backup and actual migration execution still have not been performed. |
| 50 | Feature flags | PARTIAL — CODE VERIFIED / MERGED TO BASE / NOT LIVE | Existing global Home, Studio, billing, Apps and provider rollout flags remain. Isolated PR adds functional optional image/video/BytePlus kill switches that fail closed on explicit false or invalid values while preserving older installations with unset flags; disabled models are rejected by the existing estimate/create/server routing path without charging/dispatching. Default global public AI OFF, no provider activation or original Home/design changes. [CI 38905747621](https://github.com/mvryhan-web/video-variator-android/actions/runs/38905747621) PASS; merged PR #87 b598c1d8. Scope only; real production/owner rollout still unverified. |
| 51 | First commercial vertical slice | PARTIAL | Gated path now supports plan entitlement → idempotent create → approved price → reserve → provider job → throttled async polling → S3/DB persistence → finalizing → capture, plus reconciliation/audit/abuse limits. Live provider/storage/Stripe/margin verification remains incomplete. **2026-10-16 scoped MERGED TO BASE:** [PR #97](https://github.com/mvryhan-web/video-variator-android/pull/97) makes enabled public-generation concurrency/hourly limits fail closed on missing/zero/malformed values; launch readiness blocks invalid guard. [Original exact-code CI 38907897427](https://github.com/mvryhan-web/video-variator-android/actions/runs/38907897427) PASS. [Refreshed CI #38908880552](https://github.com/mvryhan-web/video-variator-android/actions/runs/38908880552) subsequently PASS. Full paid vertical slice still PARTIAL / live provider and Stripe blocked. **#51 launch gate follow-up:** [PR #101](https://github.com/mvryhan-web/video-variator-android/pull/101) merged, [CI 38911625488](https://github.com/mvryhan-web/video-variator-android/actions/runs/38911625488) PASS; `AI_PUBLIC_GENERATION_ENABLED=true` now requires global public job policy ON with valid bounded limits before readiness reports launch-ready. Owner-only preview and paid/live flags unchanged. |
| 52 | Required implementation order | IN PROGRESS — STAGE 20 BROWSER REGRESSION VERIFIED / OTHER GATES PENDING | BASE implementation remains prioritized over later Blocks. Browser regression revealed that the old Playwright Studio wallet fixture still mocked the decommissioned `/api/ai-billing/{balance,history}` paths after merged BASE #13 switched to the separate wallet endpoints. Isolated PR updates only stale test fixtures and adds a real UI scenario for reading prepaid credits when Stripe credit-pack checkout is disabled. Stage 20 [targeted browser CI 38912726134](https://github.com/mvryhan-web/video-variator-android/actions/runs/38912726134) 6/6 PASS and [broader Studio CI 38912773014](https://github.com/mvryhan-web/video-variator-android/actions/runs/38912773014) SUCCESS; [PR #105](https://github.com/mvryhan-web/video-variator-android/pull/105) merged. Current-base reruns still queued; full staging, production migration/backup, Android/iPhone and commercial acceptance remain BLOCKED. |
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


## Continuation 21 — lazy History image previews

- Ready image History cards now fetch their protected result only when the card approaches the viewport and render an image preview.
- Video/audio cards deliberately remain lightweight placeholders so History never downloads large media just to paint the list.
- Preview object URLs are revoked whenever History reloads to avoid browser-memory leaks.


## Continuation 22 — user-visible AI plan access

- Added authenticated read-only `/api/studio/access` that reports owner scope or the exact configured public entitlement for the user's current plan.
- Studio shows plan/max-concurrent/max-per-hour when allowed, or a friendly reason when public AI/entitlements/plan status are not ready.
- The endpoint does not start generation, mutate wallet data or invent fallback plan limits.

- Studio plan-access readout now includes current active-job usage and rolling last-hour generation count when the database is available.


## Continuation 23 — owner AI purchase/refund ledger

- Added owner read-only AI purchase/refund table from Deepsyq's confirmed wallet records: user, credits, paid/refunded/net amounts, currency and ledger timestamp.
- Stripe Checkout session and PaymentIntent identifiers are deliberately omitted from the API/UI.
- The view does not call Stripe and cannot mutate/refund a payment.


## Continuation 24 — provider performance windows

- Owner provider/model metrics now support 24h, 7d, 30d and all-time windows, defaulting to 7d.
- Added success/failure rates while preserving latency/cost/credits aggregates and counting queued/finalizing as in-flight work.
- These metrics are observational only; Smart Routing is not automatically changed by them before Roadmap Block 1.


### BASE Video: authenticated reference HTTP intake — 2026-10-15

- **IMPLEMENTED IN CODE / NOT YET VERIFIED:** isolated `POST /api/studio/references` owner-only raw HTTP upload pilot, disabled by `AI_STUDIO_REFERENCE_UPLOAD_ENABLED=false`. It reuses the existing auth, ledger, S3 storage and expiry cleanup; no second media store or provider router is introduced.
- Only raw MP4 (20 MiB / declared duration at most 30 s) and PCM WAV (8 MiB / declared duration at most 60 s) are permitted by the preliminary local parser. Multipart/base64, compressed and all other media uploads remain blocked. No media stream/URL is returned to the browser.
- Each owner may hold at most two active unexpired references. Admission uses a PostgreSQL advisory transaction lock before ledger INSERT; S3 network PUT occurs after commit. Failed/ambiguous PUT remains eligible for expiry cleanup.
- Added `tests/generation-reference-upload-unit.mjs` HTTP/auth/MIME/malformed/quota cases (authored, not run on real runner). No production database migration, S3 credential, Stripe, live provider or AI credits were changed.
- **NEXT:** finish independent codec/malware validation and owner staging acceptance; confirm background cleanup runs with real storage, then design secure short-lived provider-fetch transport and verify BytePlus video/audio input mapping, pricing and explicit generation consent. No BytePlus reference media generation is available yet. Never advertise as production-ready.


### BASE Video: pre-storage FFprobe codec gate — 2026-10-15

- Added mandatory fail-closed **FFprobe** codec/duration/resolution/FPS inspection to the previously owner-only, feature-gated raw reference-upload route. FFprobe inspects only a private temporary local file; absent/unavailable probe blocks intake before any ledger INSERT or S3 PUT.
- Initial formats: MP4 H.264/yuv420p with optional AAC; PCM s16le/s24le WAV. Existing owner/byte/duration/retention constraints remain. Unsupported codecs return HTTP 415; unavailable codec inspection returns 503.
- Added targeted codec/API/ledger/S3 checks via independent GitHub Actions workflow, with PCM WAV real-probe fixture and optional H.264 real encode fixture. No live paid provider call or Stripe changes.
- **Still PARTIAL/BLOCKED, not commercial-ready**: public user uploads, malware/sanitization security review, verified deployed FFprobe package, production S3/worker acceptance, short-lived provider URL transport, BytePlus video/audio reference acceptance and approved credits are pending. No frontend reference picker, AI wallet usage, Render flag activation or production migrations.


### BASE Video: independent staged reference cleanup worker — 2026-10-15

- Corrected the existing `worker:generation` service so reference expiry cleanup does **not** depend on AI Studio activation, background polling or Google/BytePlus keys. The same worker can run **cleanup only**, recovery only, or both; cleanup-only performs no wallet initialization, AI jobs or paid provider calls.
- When cleanup is requested, startup requires configured private object storage and an already applied matching-checksum `20261015-generation-reference-assets.sql` migration, checked **read-only**. Unconfigured/mismatched storage/schema fails closed. No production migration or feature flag was enabled.
- The original S3 owner isolation, expiring ledger, `SKIP LOCKED` claims, stale-claim recovery and retryable deletes remain unchanged. Turning off incoming uploads will not turn off cleanup as long as the separate cleanup flag and storage/worker remain active.
- New unit cases in `tests/generation-worker-runtime-unit.mjs` exercise cleanup-only without provider credentials, combined recovery/cleanup, storage-not-ready and migration checksum gates. Targeted CI must include this file before marking the patch verified; production worker and private bucket still need staged acceptance.
- BytePlus ModelArk documents reference_video as a reachable URL and reference_audio as URL or Base64 for supported Seedance models. No external media fetch token, public URL, provider request, approval of costs/credits, or frontend video/audio ref picker has been enabled. Official source: https://docs.byteplus.com/pt/docs/modelark/create-video-generation-task-api


### BASE Video: verified cleanup-only worker and Seedance 2.0 media preflight — 2026-10-15

- The original `worker:generation` now supports **cleanup-only** after generation is disabled: no provider key, AI wallet, paid job/polling needed. A running cleanup mode requires existing PostgreSQL, configured S3, `AI_STUDIO_REFERENCE_CLEANUP_ENABLED=true` and an already-applied, matching-checksum reference-assets migration; no automatic production migration.
- New server-only `generation-reference-compatibility.js` validates future **Seedance 2.0** reference metadata (not media upload or actual generation): video and audio clips 2–15 seconds, each type up to three items and at most 15 seconds combined, provider video dimensions/FPS/aspect, audio supported PCM; audio-only reference batches rejected. This is **not wired to paid generation**; future quote/create must rederive trusted media metadata and require explicit owner pricing/consent.
- **Focused CI success:** GitHub Actions `Deepsyq private reference intake checks`, run **38785619683**, **33 tests passed, 0 failed, 0 skipped**, including real local H.264/PCM media, HTTP authorization, S3 mock/ledger, cleanup-only/migration gates and Seedance compatibility. No actual Render background worker, production S3, migration, provider credentials, signed provider media transport or Stripe call was tested/enabled.
- BytePlus API documentation (https://docs.byteplus.com/pt/docs/modelark/create-video-generation-task-api) allows reference_video via a reachable URL/asset ID and reference_audio via URL/Base64/asset ID subject to payload restrictions. There is still **no** provider-visible video URL, audio submission, browser upload picker, public release or paid generation from staged files. Keep reference upload flags OFF until external safety/operations/price approval.


### BASE Video: isolated PostgreSQL/S3 lifecycle + stored-media reinspection (2026-10-15)

- Added `tests/generation-reference-lifecycle-postgres.mjs`: a dedicated **127.0.0.1/localhost only**, `vv_ai_test` Postgres 16 CI schema (random temporary namespace; dropped at completion) running the original checksummed reference-assets SQL without touching production. The in-memory fake S3 checks signed private PUT/GET/DELETE requests; real FFprobe validates uploaded PCM WAV. Acceptance covers JWT-owner route fixture, cross-owner read denial, concurrent two-slot admission, expiry when intake is disabled, retry after DELETE failure and cleanup after ambiguous PUT.
- Added `server/generation-reference-inspector.js`, a **server-only** safe reinspection helper for future Seedance 2.0 jobs. It accepts UUID asset IDs but no supplied URLs/metadata, uses existing owner/ready/TTL-scoped ledger GET, re-probes actual S3 bytes, applies the existing Seedance codec/duration reference policy and returns only compatibility aggregates. Duplicate/malformed IDs are rejected. No provider payload, signed public URL, wallet hold, billing or AI dispatch is generated.
- Focused GitHub workflow `Deepsyq private reference intake checks`: run **38787247753** passed **38/38** unit checks and **7/7** isolated Postgres/S3-lifecycle assertions with no failures/skips. This confirms deterministic CI fixtures only, **not** real S3, production migrations/worker readiness, malware scanning or live BytePlus model acceptance.
- **Still BLOCKED/PARTIAL:** private S3 and expiry worker real staging acceptance, actual server FFprobe packaging, malware/container security review, owner-approved private short-lived provider media handoff, explicit model-specific credit pricing and consent, real provider tests and a UI reference picker. The user-facing feature remains OFF by default.


### BASE Video: offline ModelArk WAV payload builder — 2026-10-15

- Added **server-only and not yet provider-connected** `server/generation-reference-audio-payload.js`, preparing bounded WAV Base64 `audio_url` with `reference_audio` role for Seedance 2.0. It reuses the existing ready/unexpired owner-scoped S3 ledger, real FFprobe and Seedance compatibility checks; no duplicate service, public URL, generation task or Stripe/wallet operation.
- **Double disabled-by-default flags:** `AI_STUDIO_REFERENCE_AUDIO_PAYLOAD_ENABLED=false` and `AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED=false`. Both must be explicitly true in a controlled test context before this private helper can execute, but this is still not permission to call a paid provider. Future integration also must inject a **server-side visual-context verifier**; untrusted browser-provided image counts are not accepted.
- Conservative Base64 limit: at most 3 PCM WAV clips, at most 1 MiB each and 5 MiB JSON payload, with previously checked 2–15s each / total ≤15s and no audio-only submissions. Any video reference continues to require a separate approved short-lived provider URL or trusted asset ID; never expose raw private S3 keys.
- Targeted mocks and isolated local PostgreSQL + in-memory signed S3 lifecycle tests were expanded; **CI results will determine verification status**. Real BytePlus task acceptance, malware/security/portrait rights, production S3/worker, approved credit pricing and wallet consent remain blocked. Official rules: https://ai.byteplus.com/ark/region:ap-southeast-1/docs/create-video-generation-task-api .


### BASE Video: protected presigned reference-video GET (2026-10-15)

- Added a **server-only, unused-by-API/provider** SigV4 query signer for private S3 staged MP4, reusing existing `createObjectStorage` credentials and key layout, and `getForVideoTransfer` in the existing PostgreSQL ledger. A second SQL check requires owner-owned `ready` video and **at least 90 seconds** remaining before a URL can be signed.
- New `server/generation-reference-video-transfer.js` prepares `{type:'video_url',video_url:{url},role:'reference_video'}` for Seedance 2.0 strictly after prior owner-scoped real-byte FFprobe + compatibility inspection. It is not called by `generateBytePlus` or a browser endpoint, never creates/charges a generation job or emits URL to users/history/logs. A signed URL is a bearer capability, not a public bucket policy or proof of provider fetching.
- **Fail-closed gates:** `AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED=false`, `AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED=false`, empty exact `AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS` in `.env.example`, plus staging/cleanup enabled only in isolated test. S3 host must be explicitly allowed HTTPS public-domain DNS (not IP/internal/wildcard/port), object path must match hashed-owner UUIDv4 MP4 key, signed GET valid 15–60 s (30 s in helper), and asset expiry must exceed token lifetime by 30 s. No raw S3 signing secret in the URL or in browser responses.
- **Targeted CI success:** GitHub `Deepsyq private reference intake checks`, run **38790331214**, **50/50 unit + 9/9 real isolated Postgres/fake S3 acceptance checks passed**, zero failures/skips. Actual local 3s 854×480 H.264 MP4 staged, re-probed, signed in-memory, expiration/owner checks enforced and cleanup proven. No real BytePlus request, live S3/CDN fetch, malware/security audit, render deployment, production migration, approved costs/consent or paid wallet activity performed.
- **Next gates:** owner-approved externally reachable private bucket/CDN and short-lived URL security review, actual provider fetch latency vs 30s signature TTL, safe revocation/deletion, user rights/face privacy, malware and content checks, priced wallet reservation and explicit user consent, one controlled paid provider acceptance call only after those approvals. Video references remain **PARTIAL / BLOCKED** and user-facing upload disabled.


### BASE Video — source-built MinIO and real PostgreSQL disposal acceptance (2026-10-15)

- **Real MinIO S3 (source-built from pinned upstream) + real isolated PostgreSQL 16**, in the existing CI workflow `.github/workflows/deepsyq-reference-s3-protocol.yml`: **run 38798448778**, two full MinIO/PG lifecycle checks passed, zero failures/skips; separate local SigV4 link-security job passed. No third-party mirror, no production database/cloud S3, no customer media or paid AI calls.
- Verifies signed private MP4 PUT/GET, 30-second presigned GET, tampered/missing/expired signatures denied, signed DELETE, denial after DELETE, and disposable-bucket teardown. Added real `vv_generation_reference_assets` SQL migration in **ephemeral PG schema**, owner-only reads, expiry check constraints, disabled-intake cleanup via existing `createGenerationReferenceLedger.cleanupExpired`, and independently authenticated MinIO GET after expired-object removal. No schema modifications or production migrations performed.
- Test-only commits `737e00e`, `fd6b120`, `23d1b1c` added the integration case and respected Postgres `expires_at > created_at` check. App architecture/Stripe/worker/provider/auth untouched. Additional audit: `docs/GENERATION_REFERENCE_S3_STAGING_ACCEPTANCE.md`.
- **Still PARTIAL/BLOCKED** on actual owner-approved cloud vendor S3, DNS/TLS provider fetch, BytePlus async retrieval timing of 30s URLs, scanned user media, privacy/human likeness rights, verified costs/wallet consent, production backup/migration/cleanup worker, and explicit gated rollout. Keep all intake/presign/audio/paid-public flags OFF.


### BASE Video — pre-buffer owner upload protection (2026-10-15)

- **Done and tested (not production-enabled):** before allocating raw HTTP body buffer (≤20 MiB) or launching local FFprobe, authenticated owner intake now enforces an in-process per-owner **two-simultaneous-upload** admission cap, returning `429 REFERENCE_UPLOAD_BUSY` to a third contender. It retains the existing PostgreSQL cross-instance two-slot durable staging quota and does not change the global auth/session/router.
- **Resource cleanup:** slots release on successful responses, raw/malformed body errors, and aborts during body parsing; expensive ongoing probe/S3 work retains its slot until handler completion, regardless of a disconnected browser.
- **Targeted CI 38800557591 PASSED:** 52/52 focused unit tests, 9/9 real isolated PostgreSQL/fake-S3 lifecycle tests; zero failed/skipped. New HTTP tests prove no third concurrent FFprobe/ledger call and slot reuse after success/probe failure/invalid body. Actual MinIO + PostgreSQL expiry deletion also previously passed (38798448778). No real cloud test/provider/Stripe or production migrations/deployments performed.
- **Future approval blockers:** full global rate/abuse controls, antivirus and media privacy scan, separate owner-approved cloud S3 vendor TLS/reachability, BytePlus provider fetch latency vs presign expiry, credit costs/consent, production DB backup and cleanup worker. Leave owner upload and transfer flags OFF.


### BASE Video — owner-approved disposable cloud S3 test harness (2026-10-15)

- Added isolated `server/generation-reference-cloud-acceptance.js` + manual `scripts/verify-reference-s3-cloud.mjs` as a **code-only, OFF-by-default** staging-vendor acceptance tool. `--plan` is fully offline; future `--execute` requires exact manual consent, an existing dedicated test bucket named `deepsyq-ref-accept-...`, separate least-privilege fixture credentials, exact approved public HTTPS host, and non-production runtime. No account keys are stored in source or shared with browser/worker.
- The optional manual execution reuses existing private S3 code and a generated FFmpeg test H.264 MP4, tests signed PUT/owner GET/30s presigned GET/tamper/missing/expired/DELETE/404 and attempts S3 cleanup on partial failure. Returns sanitized codes only. **It was NOT executed on any cloud bucket;** no ModelArk fetch, pricing/credits or real provider requests, no Render production or Stripe changes. Passing it in the future will still require separately validating ModelArk async fetch latency and rights/privacy/economics.
- GitHub focused reference-intake run **38802341080**: **60/60 unit plus 9/9 local PostgreSQL/fake S3 checks passed (0 failed, 0 skipped)** including CLI offline, configuration/production-secret denial, no network on refusal, failure cleanup with mock storage. Previous isolated official MinIO plus PostgreSQL real protocol run **38798448778** green independently. Cloud S3 vendor staging remains **BLOCKED PENDING OWNER BUCKET/CREDENTIAL APPROVAL**. See `docs/GENERATION_REFERENCE_S3_STAGING_ACCEPTANCE.md`.


### BASE Video — enforced real FFprobe for S3 reference-video plan (2026-10-16)

- **Closed internal compatibility verdict bypass** in `server/generation-reference-video-transfer.js`: planner unconditionally calls the in-repository `createSeedanceStagedReferenceInspector({ledger})`; callers can no longer replace it with a forged compatible inspector. Required owner-scoped bytes are retrieved and actually re-probed through local FFprobe, checked against Seedance model and media policy, then rechecked in owner/ready/TTL ledger before any short-lived private S3 GET link is constructed. Still server-only, disabled by default, **not** wired into paid BytePlus submission.
- **Focused CI 38887304221 PASSED: 62/62 unit plus 9/9 isolated PostgreSQL/fake-S3 tests, 0 failures, 0 skips**. New tests generate real FFmpeg H.264 MP4 and confirm trusted retrieval, forged inspector ignored, malformed MP4 and real 16-second video refused **before signing**, model/ID/replay/feature flags gated. Prior actual MinIO/PG run 38798448778 green; no cloud vendor/model fetching or paid calls performed.
- Remaining real-world gates unchanged: owner-approved dedicated S3/TLS + provider region reachability, signed-fetch async timing, media scanning/privacy, approved pricing & wallet consent, production backup/migration/cleanup worker and staged owner rollout. Keep upload/presign/audio transfer OFF.


### BASE Video — batch-safe 30-second reference signing (2026-10-16)
- Fixed an offline transfer-planning race in `server/generation-reference-video-transfer.js`: after mandatory real-byte MP4 FFprobe and Seedance compatibility checks, the planner now completes **all** asynchronous owner-scoped `ledger.getForVideoTransfer` readiness/TTL checks **before** minting any short-lived presigned S3 GET. The final signing phase is synchronous, with no database `await` between signing video 1, 2 and 3; malformed link expiration is rejected. This reduces bearer-link lifetime loss from slow later queries but **does not prove** provider-side fetch within 30 seconds.
- Focused GitHub Actions run **38887993265**: **65/65 unit tests plus 9/9 isolated PostgreSQL/fake-S3 lifecycle tests passed**, no failures/skips. New tests exercise real FFmpeg/FFprobe reference bytes, a deliberately delayed second candidate lookup (zero early presigns), rejection of a later candidate (zero presigns), and malformed returned expiry (fail closed). The older official locally built MinIO+PG run **38798448778** remains a separate green proof; no new live cloud/vendor/BytePlus traffic.
- **Still BLOCKED** for production/paid dispatch: owner-approved staging cloud S3, real BytePlus asynchronous fetch latency/reliability, user media scanning, privacy/rights, model cost/credits and consent, verified DB backup/cleanup worker. New upload/presign flags remain OFF; no Stripe/Render/main/Home changes.


### BASE Video — detect changed reference bytes before signing (2026-10-16)

- **Implementation:** the internal `createSeedanceStagedReferenceInspector` now has an `inspectVideoSnapshot` method used exclusively by the disabled server-only video transfer planner. During mandatory real local FFprobe inspection it calculates SHA‑256 for each owner-scoped private MP4, while ordinary `inspect` retains its existing compatibility-only output (no digest or media key leaks). The planner freezes the requested reference IDs, completes the owner/ready/TTL ledger checks, **re-reads each private MP4** and uses constant-time digest comparison before minting **any** 30-second signed S3 GET URL. A mismatch rejects the entire video plan with `REFERENCE_VIDEO_CONTENT_CHANGED` and mints **zero** bearer links. No stored fingerprint, database migration, new provider integration or client route is introduced.
- **Targeted GitHub Actions run 38889416330 PASSED:** 69/69 unit plus 9/9 isolated PostgreSQL/fake-S3 integration tests; zero failures and zero skips. New tests verify deterministic internal-only SHA‑256, rewritten bytes after successful FFprobe, rewrite of the second asset blocking URLs for the first, and caller ID-array mutation while inspection is suspended. Previous official local source-built MinIO + PostgreSQL acceptance 38798448778 stays independently green. Production Render/Stripe, paid providers, customer media, and cloud buckets untouched.
- **Important limitation:** a second read is **best-effort integrity detection, not an atomic immutable-object guarantee**. A private S3 object could still be changed after that second read but before provider retrieval; a vendor-approved content-addressed/version-pinned GET or write-once object policy must be reviewed before enabling real ModelArk uploads. Second reads add bounded S3 read operations/latency and must be included in staging load/timeout testing. New intake, presigning and paid-reference flags remain OFF.


### Video core finished in code, advanced external gates frozen; Audio Trimmer started (2026-10-16)

- **Video core CODE VERIFIED (not LIVE):** Google Veo default model now resolves via the complete capability catalog; Text→Video, Image→Video, Seedance first/last/scene image modes, duration/resolution validation, mock async job status and user-visible Studio/History workflows are present. **Final focused run 38892230119 passed 27/27 server tests and 44/44 Chromium desktop/mobile browser tests**, no provider charges. The earlier broad suite 38890898720 failed partly from non-Video Home/mobile flows and eight ambiguous Settings-close locators; corrected Video tests and separately validated the actual Video slice. This does not mean a real BytePlus key, live model output, public credits or production deployment has been tested.
- **Advanced reference media PARTIAL / EXTERNAL BLOCKED:** existing private MP4/WAV intake, FFprobe/SHA256/MinIO/PostgreSQL and short-lived S3-link helpers stay disabled and not wired into paid dispatch. Cloud object immutability, provider 30-second fetch, malware/privacy, approved economics and real credential/bucket acceptance still require owner inputs. **No more redundant local S3 hardening cycles** before those external inputs. Unsupported 4K, real provider cancellation and audio/video reference modes must remain unavailable, not shown as working.
- **Next functional code delivered:** local Audio Trimmer for the existing Audio & Text tool, using FFmpeg.wasm and no server file upload. Source `app/src/main/assets/audio-trim-core.js`, UI `audio-studio.html/js`. **CI 38891979638 passed 3 unit + 6 desktop/mobile Chromium cases**, including real FFmpeg.wasm WAV-to-downloadable MP3. CODE VERIFIED / NOT DEPLOYED; AI Voice provider integration is a separate next task.


### BASE Everyday Tools — Video → MP3 real-device-local conversion (2026-10-16)

- **Code complete for this discrete utility, not deployed:** `app/src/main/assets/video-to-audio-core.js` extracts first real audio stream from bounded local MP4/MOV/WebM/MKV with bundled FFmpeg.wasm, emits downloadable 192 kbps MP3; `audio-studio.html/js` adds original-video preview, MP3 playback, download/share/delete/cancel with localized EN/RU/FR/UK text; `free-tools.html` advertises it. Existing local Video→M4A, audio transcription, TTS, and Audio Trimmer preserved. No upload, cloud/provider request, credits, wallet, Stripe or production updates.
- **Final scoped acceptance:** GitHub Actions **38893759236** PASSED 7/7 Node tests and 14/14 Chromium desktop/mobile browser tests; real FFmpeg.wasm converted generated MP4+AAC into MP3 with valid bytes; muted MP4 did not create empty output. Mobile browser simulation is not a physical iPhone acceptance. Project status row is **CODE VERIFIED / NOT DEPLOYED**, not global BASE DONE.
