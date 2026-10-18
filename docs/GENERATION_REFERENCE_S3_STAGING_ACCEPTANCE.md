# Deepsyq BASE Video — reference S3 staging acceptance (NOT deployed)

Status: **LOCAL + OFFICIAL UPSTREAM MINIO S3 VERIFIED IN CI / DEPLOYED S3 + MODELARK BLOCKED**.
Owner-approved layout, authentication, wallet, Stripe, current Render services and other roadmap blocks are out of scope.

## Verified in code and CI

- `server/generation-storage.js` implements signed private S3 PUT/GET/DELETE, owner-derived object keys, a separate double-flagged presigned GET for video references and 15–60s signing limits.
- `server/generation-reference-ledger.js` guards owner, readiness, TTL and cleanup in the existing PostgreSQL table; `server/generation-reference-inspector.js` rereads the actual media bytes and reruns FFprobe and Seedance checks.
- Existing focused run **38790331214** passed 50 unit + 9 isolated PostgreSQL/fake-S3 checks. No live storage or provider involved.
- New `tests/generation-reference-sigv4-http.mjs` uses an isolated HTTP server on 127.0.0.1, independently verifies SigV4 header/query authentication and confirms signed GET success, signature tampering / missing signature rejection, time expiry and failed GET after DELETE. GitHub Actions run **38792787579** passed **1/1**.
- **Official MinIO acceptance passed in CI**: workflow `deepsyq-reference-s3-protocol.yml`, run **38796164230** (`s3-real-source` and `s3-link-guards` both green). This builds pinned official MinIO from Go source on the isolated runner and verifies private signed MP4 PUT/GET, presigned GET, altered/missing/expired signature rejection, signed DELETE, denial after deletion, and disposable bucket removal. The official archived MinIO container was unavailable on Quay/Docker Hub in earlier attempts; **no unaudited mirror** was used. A specific cloud S3 vendor/region still requires separate staging acceptance.

## Cross-service acceptance: REAL PostgreSQL 16 + official MinIO

GitHub Actions run **38798448778** passed BOTH isolated jobs (**s3-link-guards** and **s3-real-source**); real source-built MinIO reported **2 tests passed, 0 failed, 0 skipped**. This adds a meaningful integration gate beyond the earlier standalone MinIO checks:

- Creates a **localhost-only** disposable PostgreSQL 16 database `vv_ai_test`, unique throwaway schema, and runs the repository's **original unchanged** reference-assets migration.
- Inserts a real, locally generated H.264 MP4 via the **existing** `createGenerationReferenceLedger.stage` and signed private MinIO PUT, then reads it back via owner-scoped ledger GET.
- Rejects access from another owner, verifies a ready video candidate can be read while unexpired, and respects the actual PostgreSQL constraint `expires_at > created_at`.
- Simulates a legitimately expired row, disables **new reference staging**, then runs `cleanupExpired` to remove the real S3 object and ledger row. An independently authenticated MinIO GET confirms the object is gone (`404`).
- Disposes the fixture schema, bucket contents and locally bound MinIO server. This never connects to production Render/PostgreSQL, the real media bucket, BytePlus, Stripe, or a customer upload.

A preceding run 38798236638 failed solely because the first fixture moved `expires_at` into the past without also moving `created_at`, violating the real database's expiry constraint. Corrected in commit `23d1b1c`; run **38798448778** passed the full checks. This is now **LOCAL S3-PROTOCOL + LOCAL POSTGRES LIFECYCLE VERIFIED**, not vendor-cloud S3, public ModelArk fetch, commercial readiness or media safety approval.

## Owner intake concurrency guard (verified before cloud staging)

The existing `server/generation-reference-upload.js` owner-only HTTP endpoint now rejects a third concurrent upload **before** `express.raw` can buffer up to 20 MiB and before `ffprobe` starts. This is a **per-process** two-slot admission guard, not a distributed rate limiter, and it does **not** replace the existing PostgreSQL advisory-lock two-active-asset quota across app instances. It releases capacity on completed response, parsing error, or disconnected body stream; during asynchronous probe/S3 work it holds the slot until the actual operation completes, even when the browser disconnects.

Run **38800557591** passed **52/52 focused unit checks + 9/9 isolated PostgreSQL/fake-S3 checks** (no skips/failures), including held concurrent uploads (third HTTP request gets `429 REFERENCE_UPLOAD_BUSY` before probe/ledger) and recovery after malformed input/failed probe. These CI fixtures do not make the public endpoint available: `AI_STUDIO_REFERENCE_UPLOAD_ENABLED=false` remains the production/default state. Full production admission/backpressure, malicious file scanning, and a global abuse policy remain staging launch blockers.

## Required before any real provider fetch

1. **Owner-controlled staging only:** agree a dedicated disposable test bucket and endpoint, with no customer media, no permanent public ACL, no user-browser presigned links, no unrestricted CORS. Do not reuse production buckets or production credentials for fixtures.
2. **Verified network and TLS:** confirm the real S3 provider serves strict HTTPS with a valid certificate at an exact allowlisted DNS hostname reachable from the approved ModelArk region. Current code rejects IP literals, private suffixes, unapproved hosts, wildcards and non-default HTTPS ports; DNS approval does not itself prove public routability or protect against provider-side fetch abuse.
3. **Storage protocol acceptance:** verify actual signed PUT → authenticated GET, 30s presigned GET, negative signature/missing signature, expiry, and signed DELETE against a real S3 implementation. Verify denial after delete and no object leak. Preserve an audit of test timing, redacting bearer URLs and object names.
4. **Lifecycle acceptance:** after confirming a restorable PostgreSQL backup and owner approval, apply the existing checksummed migration through the established `migrate:ai` process (never auto-apply it from the reference worker). Confirm owner-only intake, per-user two-slot quota and worker cleanup with both intake OFF and generation OFF, including restart and S3 delete retry.
5. **ModelArk acceptance:** independently confirm that the provider starts fetching a short-lived presigned reference URL before expiry. A 30s URL may be too short for queued/asynchronous provider fetching; change lifetime only with a reviewed threat and retention model. No paid live tests until the owner approves real model costs, rights/privacy, media scanning, credit quote + wallet reservation, user consent and one controlled test spend.
6. **Rollback:** disable new intake, presigning and audio payload flags first; **leave cleanup active** until every staged object is removed. Confirm no outstanding claims or orphaned objects before stopping the worker.

## Never infer from local tests

Local and official source-built MinIO verification is **not** real deployed cloud-vendor S3 compatibility, public provider accessibility, malware or media-sanitization approval, privacy clearance, a functioning Render background worker, or successful Seedance 2.0 generation. The current `reference_video` helper is only an internal in-memory planning object, not wired to `generateBytePlus` or user-facing Studio routes. All relevant features remain OFF by default.

See `docs/GENERATION-STUDIO.md`, `docs/AI_PRODUCTION_ROLLOUT.md`, and `PROJECT_STATUS.md` for the existing deployment and owner approval gates.


## Official source-built MinIO evidence — 2026-10-15

The official MinIO Community Edition moved to source-only distribution (https://github.com/minio/minio). We added an independent `s3-real-source` job in `.github/workflows/deepsyq-reference-s3-protocol.yml` to compile official **pinned** upstream `RELEASE.2025-10-15T17-29-55Z` with Go 1.24.8, start MinIO on **127.0.0.1:9000** with disposable data and fixture credentials, then use `tests/generation-reference-minio-protocol.mjs` against the real S3 implementation. This replaces abandoned Quay/Docker Hub images; no unofficial third-party containers are used.

CI run **38795444234** proved: MinIO accepted the application's **S3 signed MP4 PUT, private authenticated GET, and 30-second presigned GET**; the MP4 bytes matched, and a tampered signature parameter was rejected. The job then failed at a test expectation because MinIO legitimately returns **HTTP 400** for a missing signature parameter rather than HTTP 403. Commit `1fe6734` corrected that assertion to accept either explicit denial. **Subsequent full upstream-MinIO run 38796164230 passed both jobs** (real MinIO 1/1 tests, local link security 1/1 tests; zero failures/skips). An earlier run 38794713859 failed with `411 MissingContentLength` because the test-only Node HTTP request did not supply Buffer length, whereas production `fetch` does; commit `e33e33a` set the actual content length and real MinIO accepted the resulting upload. The passing **38796164230** run executed the full real MinIO expiry, signed DELETE, GET-after-delete and bucket-teardown checks. A later optional redundant anonymous-GET experiment caused `ECONNRESET` (run 38797480195); it was removed in commit `3fd658e` while retaining required negative missing-signature checks. This flaky extra experiment is not a production feature. No production S3, public bucket, real customer MP4, live BytePlus or credits have been touched.

Next: retain the full green `s3-real-source` regression gate; verify the particular owner's future production S3 provider separately (MinIO passing would not prove all S3 vendors behave identically), and only then consider secure ModelArk fetch timings/consent/pricing. Keep all reference upload, video presigning and provider-paid activation flags OFF.


## Dedicated cloud S3 vendor acceptance harness (manual, inactive by default)

The next BASE #5 gate now has a **prepared but not executed** owner-only command:
`node scripts/verify-reference-s3-cloud.mjs --plan`. It invokes `assessReferenceS3CloudAcceptance` from `server/generation-reference-cloud-acceptance.js` and performs **zero network requests**, produces only non-sensitive blocker codes (never endpoint URL, bucket names, secrets, private paths or bearer signatures), and cannot submit any AI/BytePlus task.

An independently reviewed **new, existing** disposable bucket and isolated least-privilege S3 keys must first be provided by the owner **outside production**. Configuration uses only process-local test-specific variables:

- `AI_REFERENCE_S3_TEST_ENDPOINT`: exact public HTTPS S3 API endpoint with no path/query/port/credentials
- `AI_REFERENCE_S3_TEST_APPROVED_HOST`: exact matching public DNS hostname, not an IP or internal/test suffix
- `AI_REFERENCE_S3_TEST_BUCKET`: uniquely allocated disposable bucket matching `deepsyq-ref-accept-[a-z0-9]{8,24}`, **never** the app's configured media bucket
- `AI_REFERENCE_S3_TEST_REGION`, `AI_REFERENCE_S3_TEST_ACCESS_KEY_ID`, `AI_REFERENCE_S3_TEST_SECRET_ACCESS_KEY`: isolated region and credentials, **not** the production storage credentials
- `AI_REFERENCE_S3_TEST_CONSENT=I_APPROVE_ISOLATED_REFERENCE_S3_TEST`: explicit manual owner approval for the test only

The optional `--execute` mode refuses `NODE_ENV=production`, a Render runtime, enabled public generation/billing, missing consent, missing/production-shared keys, mismatched/unapproved endpoint host, bad bucket name or incomplete S3 configuration. **Never store these test keys in `.env.example`, Render production variables, a GitHub workflow log, or a PR comment.** The script must never be run against production. The tool reuses the existing object-storage signer in an **isolated process-specific environment**, generates a tiny synthetic local H.264 MP4 with FFmpeg (no user content), PUTs to the uniquely scoped staging-reference key, verifies signed private GET and 30-second URL GET, rejects tampered, unsigned or expired bearer URLs, DELETEs the MP4, verifies `404`, and attempts cleanup even if a check fails. Its output reports only check names and explicitly says `modelArkFetchVerified:false` and `commercialReady:false`. It does **not** create buckets, change production flags/migrations, publish customer files, expose a public ACL, call providers, change billing or perform a real ModelArk fetch.

GitHub Actions focused run **38802341080** passed **60/60 unit and 9/9 isolated PostgreSQL/fake-S3 lifecycle checks (zero failed or skipped)**. Eight new cloud-acceptance tests cover offline-only defaults and CLI `--plan`, explicit consent and separation from production, approved-host/TLS restrictions, no credentials in output, verified mock S3 happy path and guaranteed attempted cleanup on failures. No real cloud S3 or provider call was made during CI; current readiness is a **code-only manual harness, not cloud acceptance**. The existing genuine local source-built MinIO/PG test remains separately verified (38798448778).

Do not select `--execute` until the owner explicitly approves the precise disposable bucket/credentials, verifies that access policies allow only the fixture namespace, and accepts the small cloud requests/egress. No API activation follows automatically, even if the manually approved test later passes.



## Mandatory real-byte video reinspection before presigning (2026-10-16)

The internal, **not connected to provider requests** `createSeedanceVideoTransferPlanner` has been hardened to construct `createSeedanceStagedReferenceInspector({ledger})` unconditionally. A caller-supplied `inspector` is **not accepted or consulted**: the planner must read each owner-scoped, ready, unexpired reference through `ledger.get`, parse and re-probe the actual MP4 bytes using the **real local FFprobe**, run Seedance 2.0 compatibility (H.264, resolution, frame rate, duration and total visual length), then perform a second ledger owner/state/remaining-TTL read immediately before minting a 30-second S3 bearer URL. Malformed MP4 or otherwise incompatible references cannot obtain a signed URL, even if code attempts to pass a fabricated `{compatible:true}` inspector.

Focused GitHub Actions **38887304221** passed **62/62 unit tests plus 9/9 isolated PostgreSQL/fake-S3 integration tests**, no failures/skips. New video planner tests use real FFmpeg-generated 854x480 H.264 MP4s plus actual local FFprobe; prove forged inspector is never called, owner ledger bytes are reread per asset, malformed media is rejected before metadata/signing, 16-second media violates Seedance input policy and flags/duplicate-ID/model errors fail early. No provider requests, customer uploads, billing, real cloud S3, public routes, wallet, Render or production flags were altered. Separate official MinIO plus isolated PostgreSQL lifecycle run **38798448778** remains verified.

This closes an **offline internal trust bypass**, not the independent pending gates for media malware/privacy, production/cloud S3 DNS/TLS, BytePlus async download timing, retention/cleanup rollout and explicitly approved paid generation. Preserve all new upload/presign/audio flags OFF.


### BASE Video — batch-safe 30-second reference signing (2026-10-16)
- Fixed an offline transfer-planning race in `server/generation-reference-video-transfer.js`: after mandatory real-byte MP4 FFprobe and Seedance compatibility checks, the planner now completes **all** asynchronous owner-scoped `ledger.getForVideoTransfer` readiness/TTL checks **before** minting any short-lived presigned S3 GET. The final signing phase is synchronous, with no database `await` between signing video 1, 2 and 3; malformed link expiration is rejected. This reduces bearer-link lifetime loss from slow later queries but **does not prove** provider-side fetch within 30 seconds.
- Focused GitHub Actions run **38887993265**: **65/65 unit tests plus 9/9 isolated PostgreSQL/fake-S3 lifecycle tests passed**, no failures/skips. New tests exercise real FFmpeg/FFprobe reference bytes, a deliberately delayed second candidate lookup (zero early presigns), rejection of a later candidate (zero presigns), and malformed returned expiry (fail closed). The older official locally built MinIO+PG run **38798448778** remains a separate green proof; no new live cloud/vendor/BytePlus traffic.
- **Still BLOCKED** for production/paid dispatch: owner-approved staging cloud S3, real BytePlus asynchronous fetch latency/reliability, user media scanning, privacy/rights, model cost/credits and consent, verified DB backup/cleanup worker. New upload/presign flags remain OFF; no Stripe/Render/main/Home changes.


## Two-read MP4 integrity snapshot before private S3 signing (2026-10-16)

- **Implementation:** the internal `createSeedanceStagedReferenceInspector` now has an `inspectVideoSnapshot` method used exclusively by the disabled server-only video transfer planner. During mandatory real local FFprobe inspection it calculates SHA‑256 for each owner-scoped private MP4, while ordinary `inspect` retains its existing compatibility-only output (no digest or media key leaks). The planner freezes the requested reference IDs, completes the owner/ready/TTL ledger checks, **re-reads each private MP4** and uses constant-time digest comparison before minting **any** 30-second signed S3 GET URL. A mismatch rejects the entire video plan with `REFERENCE_VIDEO_CONTENT_CHANGED` and mints **zero** bearer links. No stored fingerprint, database migration, new provider integration or client route is introduced.
- **Targeted GitHub Actions run 38889416330 PASSED:** 69/69 unit plus 9/9 isolated PostgreSQL/fake-S3 integration tests; zero failures and zero skips. New tests verify deterministic internal-only SHA‑256, rewritten bytes after successful FFprobe, rewrite of the second asset blocking URLs for the first, and caller ID-array mutation while inspection is suspended. Previous official local source-built MinIO + PostgreSQL acceptance 38798448778 stays independently green. Production Render/Stripe, paid providers, customer media, and cloud buckets untouched.
- **Important limitation:** a second read is **best-effort integrity detection, not an atomic immutable-object guarantee**. A private S3 object could still be changed after that second read but before provider retrieval; a vendor-approved content-addressed/version-pinned GET or write-once object policy must be reviewed before enabling real ModelArk uploads. Second reads add bounded S3 read operations/latency and must be included in staging load/timeout testing. New intake, presigning and paid-reference flags remain OFF.
