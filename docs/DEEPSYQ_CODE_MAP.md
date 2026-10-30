# DEEPSYQ — Graphify code map (server only)

> Generated offline from Graphify AST. Safe identifiers/paths only; not source-of-truth. No private graph, source snippets, secrets or user files.
> Agents A/B/C/D, coordinator #5 and Jules: **look here first**; open only the linked source and changes after the SHA. If SHA is stale, verify only affected files.

Source commit: `464d6deb85375fb44db390eb222405e905feb419`  | Graphify pinned: `86c57be8204673c2a1b9849a3292a7dd3ab373d8`
Scope: `server/` | Indexed files: 54 | Named symbols: 143 | Checked relations: 50

## Topic finder (matching filenames)

- **Credits, payments and pricing:** `server/generation-purchased-provider-boundary.js`, `server/generation-subscription-credits.js`, `server/generation-wallet.js`
- **Video, providers and jobs:** `server/compare-ai-mock-worker.js`, `server/generation-provider.js`, `server/generation-purchased-provider-boundary.js`, `server/generation-storage.js`, `server/generation-video-submit-uncertainty.js`, `server/generation-worker.js`, `server/product-watcher/worker.js`, `server/telegram-video-core.js`, `server/telegram-video.js`
- **Image, Canvas and Home:** `server/deepsyq-preview.js`, `server/generation-openai-image.js`
- **Audio and voice:** `server/speech.js`
- **AI Apps, Inspiration, History:** `server/generation-inspiration.js`, `server/tool-policy.js`, `server/workspace-job-view.js`, `server/workspace-project-policy.js`
- **Accounts and security:** `server/email-auth.js`, `server/generation-trial-policy.js`, `server/product-watcher/scheduler-state-policy.js`, `server/tool-policy.js`, `server/user-agent-plan.js`, `server/user-agent-stage1-local-draft.js`, `server/workspace-project-policy.js`

## Source symbol map

### `server/ai-migrations.js`

AI_MIGRATION_FILES (L4)

### `server/ai-preflight-errors.js`

SAFE_CODES (L4)

### `server/ai-preflight.js`

base (L7) · report (L7)

### `server/compare-ai-mock-worker.js`

executedPlanIds (L6) · executedPlanTokens (L7)

### `server/db.js`

db.js (L1) · adminEmail (L6) · pool (L8)

### `server/deepsyq-preview.js`

app (L12) · port (L13) · root (L14) · assets (L15) · disabled (L16) · ownerMedia (L41) · imageMedia (L42) · approvedItems (L45) · previewItems (L46) · creativeMedia (L54)

### `server/email-auth.js`

scrypt (L5) · attempts (L6)

### `server/generation-byteplus.js`

IDS (L4) · VIDEO_MODELS (L18) · FORMAT_MODELS (L19) · SIZES (L20)

### `server/generation-consent.js`

GENERATION_CONSENT_VERSION (L6)

### `server/generation-errors.js`

KNOWN (L3)

### `server/generation-inspiration.js`

KINDS (L5) · RATIOS (L6) · INPUTS (L7) · TARGETS (L8) · RIGHTS (L9) · initByPool (L10)

### `server/generation-onboarding.js`

TARGETS (L10)

### `server/generation-openai-image.js`

MODELS (L4) · QUALITY (L7) · MIME (L8) · PNG (L10) · PNG_CRC_TABLE (L45)

### `server/generation-provider.js`

UNWIRED_VIDEO_CONTROLS (L8)

### `server/generation-purchased-provider-boundary.js`

PurchasedDispatchDenied (L8)

### `server/generation-reference-cloud-acceptance.js`

REFERENCE_S3_TEST_CONSENT (L10) · checks (L14) · keys (L18)

### `server/generation-reference-compatibility.js`

MAX_BYTES (L7)

### `server/generation-reference-media.js`

LIMITS (L3) · STUDIO_REFERENCE_MEDIA_LIMITS (L87)

### `server/generation-reference-probe.js`

execFileAsync (L10)

### `server/generation-reference-upload.js`

RAW_TYPES (L8) · raw (L9)

### `server/generation-storage.js`

MIME_EXT (L5)

### `server/generation-subscription-credits.js`

PLANS (L4) · PRICE_KEYS (L5)

### `server/generation-templates.js`

TYPES (L5) · INPUTS (L8) · initByPool (L9) · RIGHTS (L10)

### `server/generation-trial-policy.js`

TRIAL_PREVIEW_DURATION_MS (L54)

### `server/generation-video-submit-uncertainty.js`

VIDEO_SUBMISSION_UNCERTAIN (L6)

### `server/generation-wallet.js`

MAX_CREDITS (L3) · GenerationWallet (L12)

### `server/generation-worker.js`

storage (L11) · state (L12) · cleanupTask (L38) · heartbeat (L51)

### `server/lifetime.js`

lifetime.js (L1)

### `server/migrate-ai.js`

checkOnly (L7)

### `server/product-watcher/alerts.js`

alerts.js (L1)

### `server/product-watcher/briefs.js`

briefs.js (L1) · LOCK (L2)

### `server/product-watcher/content-tasks.js`

LOCK (L5)

### `server/product-watcher/lite-email-draft.js`

STAGE1_LITE_SOURCES (L3) · ALLOWED_DETAILS_KEYS (L4)

### `server/product-watcher/monitor.js`

monitor.js (L1) · ADVISORY_LOCK_KEYS (L12)

### `server/product-watcher/official-sources.js`

OFFICIAL_SOURCE_INTERVAL_MS (L3) · OFFICIAL_SOURCE_MAX_BYTES (L4) · LOCK_KEYS (L5) · OFFICIAL_SOURCES (L8) · OFFICIAL_TOPIC_RULES (L25) · OFFICIAL_TOPIC_CATEGORIES (L32)

### `server/product-watcher/owner-status-view.js`

RUN_STATUSES (L16) · PROPOSAL_TYPES (L17)

### `server/product-watcher/readiness.js`

readiness.js (L1) · WATCHER_REQUIRED_TABLES (L6) · BASE_REQUIRED_TABLES (L17) · FLAG_NAMES (L18)

### `server/product-watcher/run-once.js`

dryRun (L5)

### `server/product-watcher/scheduler-state-policy.js`

SCHEDULER_STATUSES (L10) · WORKER_HEARTBEAT_TTL_MS (L20) · SCHEDULE_INTERVAL_15M_MS (L21) · SCHEDULE_OVERDUE_THRESHOLD_MS (L22) · BOUNDED_SCHEDULE_HINTS (L24) · SECRET_PATTERNS (L31)

### `server/product-watcher/scheduler.js`

scheduler.js (L1) · WATCHER_INTERVAL_MS (L6)

### `server/product-watcher/worker.js`

worker.js (L1) · timer (L73)

### `server/reminders.js`

reminders.js (L1) · validFrequency (L12) · validChannel (L13) · leads (L14)

### `server/server.js`

server.js (L1) · app (L26) · port (L26) · __dirname (L28) · rootDir (L29) · staticDir (L30) · ffmpegDist (L31) · ffmpegCoreDist (L32) · appUrl (L34) · googleJwks (L39) · appleJwks (L39) · plans (L40) · registerTelegramWebhook (L136) · generationBilling (L183) · generationStudio (L187)

### `server/speech.js`

speech.js (L1) · SPEECH_MODEL (L4) · voices (L5) · languages (L6)

### `server/telegram-free-mini.js`

TELEGRAM_FREE_LIMIT (L6)

### `server/telegram-video-core.js`

VIDEO_MAX_BYTES (L3) · VIDEO_MAX_DURATION (L4) · VIDEO_MODES (L5) · WORKER_NEXT (L6) · WORKER_REPORT (L7)

### `server/telegram-video.js`

DAILY_LIMIT (L7) · msgBytes (L8)

### `server/telegram.js`

telegram.js (L1) · commands (L6)

### `server/tests/lifetime.test.mjs`

lifetime.test.mjs (L1) · config (L7) · paid (L8)

### `server/tool-policy.js`

TOOL_TRIAL_LIMIT (L1) · TOOL_MINIMUM_PLAN (L2) · ranks (L3)

### `server/user-agent-plan.js`

AUTHORIZED_CAPABILITIES (L16) · GOAL_TEMPLATES (L103)

### `server/user-agent-stage1-local-draft.js`

WORKFLOWS (L15)

### `server/workspace-job-view.js`

ALLOWED_STATUSES (L8)

### `server/workspace-project-policy.js`

ALLOWED_STATUSES (L12) · WorkspacePolicyError (L14)

## Link traversal

Safe relationship edges are available in `docs/DEEPSYQ_CODE_MAP.json` (numeric node indices). This is a navigation hint, not evidence of runtime behavior.
