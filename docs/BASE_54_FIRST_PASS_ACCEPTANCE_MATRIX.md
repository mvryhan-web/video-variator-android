# BASE #54 — first-pass owner acceptance matrix (strict NO-GO)

2026-10-16. Agent D / Issue #75. This is a **read-only evidence inventory**, not an approval to deploy. The original, immutable `docs/DEEPSYQ_PLATFORM_SPEC.md` §54 requires all 15 user milestones AND owner diagnostics. A file, mock-browser PASS, or a Render visual preview is not a substitute for a real user-paid-generation acceptance test. All steps below are **NOT LIVE VERIFIED**; code presence is not a completion flag.

## 15 required new-user outcomes

| # | Original requirement | Existing scoped code/test evidence | Real acceptance still required |
|---|---|---|---|
| 1 | Register a new user | `server/email-auth.js` email register/login and `server/server.js` Google/Apple auth routes | Real user creates account and signs in on staging across supported devices; provider credentials verified |
| 2 | See new AI Home | `app/src/main/assets/deepsyq.html`, protected owner-approved hero; `tests/deepsyq.spec.mjs` | Latest approved reference assets, responsive navigation and real mobile acceptance; never replace locked hero |
| 3 | Obtain or buy AI credits | `server/generation-wallet.js`, `server/generation-billing.js`; merged #148 duplicate Price-ID protection | Owner-approved offer, signed **test** purchase/welcome grant and ledger inspection; no live purchase by default |
| 4 | Open Canvas | Deepsyq nav and `canvasFeature` entry, Studio pages | User opens expected functioning Canvas/workspace rather than merely seeing a link |
| 5 | Upload an image | Studio reference UI and `server/generation-reference-upload.js` staging/private workflow | Approved authenticated image intake, format/size safety, staged private storage, provider compatibility, privacy/expiry |
| 6 | Write a prompt | `generate-studio.html` and `generate-studio.js` prompt composer | Real user writes/edits prompt and previews approved credit charge |
| 7 | Create an image | `server/generation-provider.js` and `server/generation-studio.js` provider dispatch; synthetic model tests | Real approved provider image output, valid media returned, cost recorded, stored and reopened |
| 8 | Create a video | `server/generation-byteplus.js`, `server/generation-studio.js`, async poll; synthetic lifecycle tests | Paid/approved BytePlus video with real model, CDN, storage, task completion and correct duration/resolution charge |
| 9 | Close page during processing | `server/generation-worker.js` and `generation-worker-runtime.js` plus durable job rows | Verified independent worker on staging survives browser close, process restart and ambiguous provider failure without resubmission |
| 10 | Reopen History later | `GET /api/studio/jobs`, `generate-studio.js` History, `tests/generation-history-media.spec.mjs` | Same account retrieves persisted result after new browser session, not just mocked History |
| 11 | See finished result | `GET /api/studio/jobs/:id`, `GET /api/studio/jobs/:id/media` | Genuine generated image/video stored durably and retrievable after return |
| 12 | Download result | Studio Download action and authenticated media route backed by storage | User downloads real correct media on desktop and mobile, MIME/content and retention verified |
| 13 | Correct credits charged | `GenerationWallet.reserve/settle`, signed estimate and job credits fields; Postgres tests | Controlled image+video purchased-credit reserve/capture once, duplicate request does not double-charge |
| 14 | Credits returned after confirmed failure | `wallet.settle` confirmed failure path, owner billing review for ambiguous states | Fail an actual staging generation with known no-provider-spend outcome; prove reserve release, ledger and retry/no duplicate rules |
| 15 | Continue old Video Uniquifier through Tools | `tools-hub`/`free-tools`, protected legacy routes and regression tests (`base-legacy-tools-entry.spec.mjs`) | Existing authenticated Uniquifier, subscriptions, downloadable legacy files tested after newest BASE on mobile and desktop |

## Owner/admin acceptance — required independently

| Original owner diagnostic | Current verified code evidence | Open gap |
|---|---|---|
| Provider and model | Owner-only `GET /api/studio/admin/jobs` returns `provider`, `model`, `status` | Real provider job checked after genuine payment and processing |
| Provider task ID | Async `vv_generation_jobs.operation` is stored while processing but is cleared when finishing; owner jobs response omits a persistent task ID | **CODE GAP**: owner must see durable safe task ID after completion; handed to Agent B Issue #73. Never show a secret poll token publicly |
| Status and error | Owner jobs response includes status, error/error_message | Verify real success, failed, ambiguous and recovered states |
| Provider cost | Owner jobs response includes `estimatedCost`, `actualCost`, `costCurrency` (may be null) | `estimated_cost` is populated from configured price; cannot claim `actual_cost` or gross margin without a trusted provider invoice/usage source. No fake margin |
| Charged credits | Owner jobs response includes creditsReserved and creditsCharged | Validate against real wallet ledger and settlement after actual provider result and Stripe webhook |

## Non-negotiable staged acceptance order

1. Obtain owner-approved exact image/video models, provider prices, account keys, signed Stripe **test** products/prices, storage retention/credentials, and documented refund economics without putting secrets in GitHub.
2. Verify independently restorable PostgreSQL backup and isolated staging restore, checksum-safe migrations and rollback; never run a schema-changing check against production.
3. Deploy a dedicated staging worker and permanent private object storage; verify upload, download, deletion and recovery. The older no-secret visual preview is NOT this full staging environment.
4. Run the full 15-step journey in staging on both desktop and mobile with a real approved provider job (image + video) and signed **test** credit pack purchase, idempotent webhook, cumulative refund and confirmed-failure release.
5. Check legacy login, subscriptions, Video Uniquifier, mobile Android/iOS behavior, latest locked Home and App/Tools links. Verify privacy, Terms, commercial-use rights, ownership of media and abuse budget.
6. Fulfill `docs/DEEPSYQ_SEO_RELEASE_CHECKLIST.md` and Issue #156 for actual public pages (crawlable unique title/canonical/sitemap/robots/schema, approved demos, no accidental private indexing); do not claim organic search results without Search Console/Bing evidence.
7. Agent 5 + owner review latest BASE/PR CI, sign off provider task ID and real provider cost visibility; only THEN consider explicitly approved `main` integration and public flags, sequentially. Keep `AI_PUBLIC_GENERATION_ENABLED=false`, `AI_BILLING_ENABLED=false`, `DEEPSYQ_HOME_ENABLED=false` until those approvals.

## Verified limits and status

- `BASE #54` remains **NOT MET**, and `BASE #55` final commercial report remains **PENDING**. This matrix does not mark any milestone `LIVE VERIFIED`.
- Verified separate D implementation progress: [PR #148](https://github.com/mvryhan-web/video-variator-android/pull/148) merged to BASE after 8/8 CI success. Draft D PR #153 public webhook response redaction, #158 Image+Video pricing coverage and #164 historical Stripe settlement protections have isolated checks but their last reviewed GitHub CI remains queued. Never call those merged/live without exact current-head workflow success.
- Render production still follows `main`; the separate Render Deepsyq visual preview was last observed on an older commit with autoDeploy OFF. Neither is authorized as a commercial paid staging test.
- This document does not modify customer account, Home, provider, Stripe configuration, payments, DB migration, worker, Render or main. Original BASE/Block TXT is unchanged.
