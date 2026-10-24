# Deepsyq — targeted implementation review of roadmap Blocks 1, 2, 4, 6, 7

**Date:** 2026-10-16 · **Owner request:** quickly revisit previously reviewed Blocks 1–7, skip the already-completed/designed Blocks **3 (Inspiration)** and **5 (Internal Product Watcher)**, and change only what materially helps the future agents implement the approved product.

## Authority and boundaries

This document is a **small implementation-risk supplement**, **not a rewritten owner TXT** and **not a new product roadmap**. The seven canonical sources in `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_*.txt` remain unchanged; do not touch the original 55-point BASE specification. Existing `AGENTS.md`, `PROJECT_STATUS.md`, owner-approved Home, all active agent claims/PRs, current auth/PostgreSQL/router/Studio/History/jobs/Stripe/wallet and functional Video Uniquifier take precedence. No feature code, assets, bills or deployment are authorized by this audit. Recheck actual current GitHub branch and file owner before coding.

**Owner policy [#182](https://github.com/mvryhan-web/video-variator-android/issues/182) overrides all earlier examples of "paid smoke tests" or provider-funded welcome/trial demos:**
- NEVER use billable AI API, paid generative image/video/music/audio/text calls or billable GPU for tests, demos, staging, QA, or owner-funded content, even with extra permission. Use offline fixtures/mocks and verifiably legal zero-additional-cost mechanisms only; unknown billing status means **do not call**.
- In **actual customer-facing production**, a billable AI call is allowed **only** after confirmed successful customer payment, with sufficient **purchased** credit balance (not promotional/admin/welcome credits), validated quote, consent and server-side spending safeguards. A display of credits is not proof of payment.
- Do not publish Block 1/2/4/6/7 until separately ready and owner-approved; first real **Image + Video + Audio + minimal AI Chat MVP** and safety prerequisites remain priority [#172](https://github.com/mvryhan-web/video-variator-android/issues/172). Minimal chat is NOT a completed User Agent.

**Read-first source mapping:** Block 1 = Compare/Smart; Block 2 = User Agent; Block 4 = Studio/My Workspace; Block 6 = Voice/Device Cleanup; Block 7 = Pricing/Credits/Stripe. Blocks 3 and 5 are **OUT OF SCOPE; do not alter**. Current audit is based on those exact five original TXT contents, previously discussed architecture and selected real `deepsyq-platform` source/status; lack of proof below means **NOT VERIFIED**, not absence of every possible branch implementation.

## Block 1 — Compare AI + Smart Model Routing

**Verdict:** Original brief is clear and should **NOT** be rewritten. **ADD narrow acceptance safeguards** to implementation handoff.

Existing evidence: `server/generation-routing.js` implements a **media generation** pre-dispatch compatible candidate ordering and guarded Smart toggle; `server/generation-studio.js` currently dispatches media models through Google/BytePlus. That is **not** proof that a separate **text Multi-AI Compare** service across OpenAI/Gemini/Anthropic/Mistral or synthesis UI exists. Status/claims list Block 1 `NOT STARTED`, BASE provider router `PARTIAL`. Avoid duplicate router or assumption that media providers automatically offer text Chat/Compare.

**Important missing execution details:**
1. **Quote + reserve for the whole Compare fan-out before starting ANY paid calls**: if 2–4 text models are chosen, the server quotes per-provider/model estimated credits plus safe maximum and reserves purchased customer credits atomically. If budget cannot cover permitted maximum, refuse or offer a **user-approved smaller set**; never start the first call and discover insufficient balance halfway through. Config-driven plan/provider availability; no fake provider cards.
2. Run model calls in parallel under **per-provider deadlines and one request-level budget**; return available real partial results separately, labeled `success / timeout / failed / unavailable`. Capture actual billable completed/accepted usage and settle/reconcile reservations correctly; do not charge for a never-submitted provider request, but do **not automatically refund an ambiguous already-accepted call**. No blind paid retries, silent more-expensive fallback, or duplicate billing on refresh.
3. **Combine best answer is a separate optional billable synthesis step**, with distinct available synthesis model, fresh quote, sufficient purchased credits and **explicit approval BEFORE provider dispatch**. Never imply Combine is free or fabricate a synthesis when the provider is off. Allow Copy/Save of any successful individual result without requiring all providers to succeed.
4. Save user-owned Compare session, chosen models and resolved **actual model versions**; provider tokens, spend and latency; hide provider secrets. Redact log content appropriately; use job/request idempotency. Server-side reasoning for Smart decisions must distinguish **measured** quality/reliability from unverified heuristics, and it must fail closed if suitable current model/pricing unavailable.
5. **Trial $0.99** text is a proposed product offering, not proof of enabled checkout, confirmed purchased credits or cost-safe limits. Do not route promotional trials to paid AI unless payment was real and purchased-credit eligibility confirmed. No billable developer QA.

**Offline acceptance:** 3-model case with one timeout gives 2 user-owned real-*fixture* responses and correct available actions; quote reserve/release ledger fixture reconciles; same request id does not duplicate fan-out; insufficient purchased balance blocks all calls; Combine asks for a separate quote; default Smart cannot silently become higher cost; tests assert provider dispatch counter remains zero.

## Block 2 — User Agent / “Do it for me”

**Verdict:** Original goal→plan→approve→async execute→deliver is already correct. **ADD durable spending, resume and side-effect rules**, not a second Agent framework.

1. Reuse existing Deepsyq account/permissions, AI Provider Router, job queue, Studio, project records and purchased-credit wallet. **Do not turn minimal AI Chat into a pretend autonomous Agent** or fabricate completed external actions. If a tool is not connected/enabled, show it unavailable and propose only genuine existing steps.
2. The plan needs a typed step DAG or bounded ordered list: tool ID/version, required inputs, expected output artifact, permitted users, **estimated credits and maximum exposure**, timeout/attempt policy, step idempotency key and approval state. Set hard max steps, run duration, parallel fan-out and purchased-credit budget; these must be server-enforced.
3. Before the **first paid action**, display an understandable step plan, exact available quote or bounded maximum, and ask approval. If a later step exceeds its approved cap or changes the provider/tool/price, pause for **fresh explicit customer confirmation and purchased-credit check**. Unapproved/synthetic estimates cannot authorize spend.
4. **Durable recovery:** persist `planned / waiting_approval / queued / running / succeeded / partial / failed / cancelled` (or equivalent) and each step's accepted provider/job id. Resume after refresh/restart from the same step without duplicate paid dispatch. A timeout **after provider acceptance** is `unknown / reconcile`, not `retry` or `refund` automatically.
5. Stop/cancel must honestly differentiate stopping **future steps** from cancellation of a provider job that already accepted the work; cannot promise refunds without a confirmed cancellation/settlement. Confirmation for destructive operations, external publishing, account modification, sending messages, purchase/checkout; never infer OS/app permission from a spoken/chat "yes" alone.
6. Final deliverable links, images, text, audio and files must be user-owned, private, durable in existing History/Workspace. Show step provenance, honest partial results, error/recovery options and true spent/held/refunded credits.
7. Product Watcher is separate administrative intelligence. User Agent cannot access Product Watcher owner dashboard or impersonate the owner; roles and audit logs stay separate.

**Offline acceptance:** simulate a 3-step workflow with crash between provider acceptance and local acknowledgment, customer deny of a step, stale pricing, cancellation and restart. Prove no duplicate billable dispatch, no other-user artifact leaks, and no "completed" without a verified output.

## Block 4 — Studio + My Workspace

**Verdict:** UX/navigation and template/skill relationship are sufficiently defined; **leave those original sections alone**. Add data lifetime/permission precision to future implementation.

1. **Do not create another editor, project DB or storage stack**. First inventory existing Studio, History, jobs and any project record; extend only what is absent. Make project distinct from job: project may reference **many** user-owned tasks/media and retain a versioned draft; History shows actual jobs, not false successful projects.
2. **Every project/template/media operation is authenticated and owner-scoped server-side**: list/read/preview/rename/duplicate/archive/delete/export. URL guessing must never reveal another user’s prompt, signed URL or image/video. Signed asset links are limited-time and authorized.
3. Templates are immutable masters with version/license/provenance; "Use Template" creates an independent user-owned snapshot, not a mutable shared reference. Reusing Inspiration assets requires real sharing/licensing rules, not publicizing other users' private jobs.
4. Clear lifecycle: `draft / in_progress / completed / archived / deleted` as applicable; explicit difference between **Archive** (non-destructive), **Delete** (confirmed and scoped), and **Delete underlying generated assets** (if supported). Define storage retention/soft-delete/recovery consistent with existing policy instead of promising reversible deletion without infrastructure.
5. Concurrent tab/update collisions must not silently lose edits: revision/version check, timestamps, debounced autosave with success feedback, conflict resolution or last-write policy disclosed. Do not store huge sensitive uploads insecurely in browser localStorage.
6. Agent Skills are **shortcuts into the SAME authorized Block 2 User Agent** with prefilled settings and fresh pricing/approval, not magical shortcuts that run paid tools without consent. Until advanced Agent exists, mark real unavailable skills **Coming Soon**, not functional.
7. Mobile navigation and keyboard accessibility, empty/failed/loading states, pagination/filters and duplicate-operation idempotency are acceptance checks, not invitation to redesign locked Home.

**Offline acceptance:** 2 distinct users attempting same project ID get isolation; template clone does not mutate master; archive leaves items recoverable only if actually supported; double-click Duplicate yields one intended copy; stale tab cannot silently overwrite newest project.

## Block 6 — Voice Agent + Device Cleanup

**Verdict:** Existing original TXT already correctly covers personality, consent, iPhone limitations, exact vs similar duplicates and privileged Owner Mode. **No creative rewrite required.** Add permissions/failure-mode contracts.

1. Onboard Voice via explicit mic activation; visible indicator, immediate Stop/Mute/End, raw audio retention setting, transcript visibility/deletion, and device Bluetooth/speaker routing fallbacks. If microphone permission is refused, voice falls back to **real text mode** without dead buttons. Never generate surprise audio/autoplay.
2. Streaming/barge-in and speech-to-tool must not trigger side effects just from a partial/uncertain transcript. Read-back/confirmation for paid actions, deletion, file writes, sharing, messages, owner controls; abort pending actions on End or account logout. Confirmed spoken consent **never substitutes native/browser permission prompts**.
3. Browser cleanup: feature-detect File System Access / pickers; **unsupported browsers get file-picker preview or limited read-only scan** (if feasible), NEVER promise whole-device scan, directory-wide deletion or access to another app's data. Access limited to explicitly selected handles and permission scopes, which can expire/be revoked. iPhone/Safari and Android behavior need separate actual device checks.
4. Exact duplicate = equal bytes/hash confirmed; similar photo/video = non-destructive suggestion with false positive risk. **Do not delete** visually similar, burst, old-download, blurry, or duplicate-labeled files automatically. Require per-file selection + final confirmation; prefer OS Trash/Recently Deleted when actually supported, and **disclose permanent deletion otherwise**. Scan limits, battery, memory and processing-local privacy are required.
5. Voice actions are routed through existing **User Agent/Compare/Tools permission controls**; a voice command does not create a separate independent wallet or tool runner. Count true audio input/output and nested model/tool costs with limits. Extra Voice allowance for free promotional users MUST NOT call billable provider; Trial requires verified purchased-credit eligibility per #182.
6. Owner-only Product Watcher reads require current owner role at the **server endpoint** and audit; owner-critical change still requires separately verified approval. Narration cannot expose private owner briefs to normal users, and cached transcript must not leak when accounts change.

**Offline acceptance:** deny/revoke mic; interrupted ambiguous command with a pending purchase; user selects two sample files from scoped picker and refuses delete; simulated identical hash vs perceptual near-match; Safari/Android browser capability branches; normal user cannot hear Owner-only data. No paid STT/TTS live test.

**External reference for agents to re-check before implementation:** MDN File System Access permissions and limited browser support; browser support is not universal: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/requestPermission and https://developer.mozilla.org/en-US/docs/Web/API/File_System_API .

## Block 7 — Pricing, Credits, Stripe & Unit Economics

**Verdict: highest priority clarification; original TXT has good ledger/Stripe/unit-economics foundation but later owner financial rule (#182) changes practical eligibility.** Keep original prices as owner-approved **plan labels** but do not activate a plan/Trial/AI amount without verified unit economics, Price IDs and commercial approval.

1. **Separate ledger buckets / provenance:**
   - `purchased_confirmed` = credits arising from successfully paid/verified Stripe events and eligible for **billable provider dispatch** after price/consent checks; track purchase/charge/refund source to avoid double use.
   - `welcome / promo / admin / free / demo / unconfirmed / legacy` = NEVER eligible to trigger a billable provider; can be applied to no-extra-cost local tasks or fixtures as explicitly allowed. Do not "borrow" paid credits or silently convert a free grant to purchased status.
   - Plans with included monthly paid-AI credits require explicit accounting: credits must be backed by **actual confirmed customer payment** and approved model economics; on unpaid invoice, failed renewal, refund or chargeback, suspend new provider spending according to auditable policy. A user being signed in or holding a free trial label is NOT sufficient.
2. **Request transaction:** authenticated user → server model/capability/quantity check → verified provider price + user-facing **whole-request max quote** → confirmed purchased-credit funding → atomic reservation/idempotency key → at most one authorized provider dispatch → actual usage and cost record → capture/release with justified evidence. A Compare/Agent fan-out must account for aggregate max and per-step reservations, not just first cheap call.
3. **Failed or ambiguous acceptance:** after provider acceptance / uncertain timeout, do **not** automatically retry or refund. Hold for reconciliation/owner review using provider task identifiers and idempotent operations. Return only truthful customer state and preserve durable History; never promise "free failure" if provider may have charged.
4. **Webhook and Stripe:** verify raw-body signature, idempotent event/credit posting, handle out-of-order and duplicate/late payment events, missed webhook reconciliation, subscription updates/refunds/disputes, and currency/FX separation. Never mint paid-eligible credits on client redirect/success-page alone. No duplicate Stripe products or public plan toggles.
5. **$0.99 Trial / promotional marketing:** original Block 7 says do not finalize without approval; separately recorded owner proposal is **$0.99 USD for three days, one-time, no auto-renewal** for preparing UX, but there is **no verified live paid checkout/terms/AI entitlement** and no inference of unlimited/nonpaid AI usage. Apply strict prepaid-customer-only policy in any eventual implementation, no fake "free AI credits" that spend provider money.
6. **Spending safety:** approved per-provider/model price currency, tokens/images/seconds and variable options; hard user + provider + overall platform spend ceilings and operational kill switch, not only display warnings. Gross margin includes failed jobs, storage/egress, fees and infrastructure; lifetime €2,999 does NOT include unlimited AI. Never combine unlike currencies without FX policy.
7. **Testing and launch distinction:** mock Stripe events, signed test-mode fixtures, simulated wallets/providers, no billable AI calls. **End-to-end real customer paid generation is a future launch criterion**, not a test the agents can pay for or simulate as completed. Deployment/charging/customer-specific production requires independent owner approval and verified live safety gates.

**Offline acceptance:** 1 purchased user succeeds at ledger authorization with mocked provider, 1 welcome-only user is rejected BEFORE any billable dispatch, duplicate/refunded/out-of-order events do not grant extra spendable funds, 2 simultaneous requests cannot overspend, ambiguous provider acceptance stays held for reconciliation, fail-closed if price/FX/model unavailable. Record exact test evidence without treating mocks as successful commercial launch.

## Review outcome and handoff

| Block | Exact original TXT | Focused issue | Decision |
| --- | --- | --- | --- |
| 1 Compare / Smart | **UNCHANGED** | aggregate prepaid fan-out + separate synthesis quote | Supplement only |
| 2 User Agent | **UNCHANGED** | durable step execution, paid approval/cancel semantics | Supplement only |
| 4 Studio / Workspace | **UNCHANGED** | ownership, immutable templates, project lifecycle | Supplement only |
| 6 Voice / Cleanup | **UNCHANGED** | scoped OS permissions, truthful cleanup, no AI free spend | Supplement only |
| 7 Pricing / Credits | **UNCHANGED** | purchased-credit provenance + fail closed, #182 overrides trial hints | **P0 supplement** |
| 3 Inspiration | **NOT REVIEWED / UNCHANGED** | owner excluded as already done | No change |
| 5 Product Watcher | **NOT REVIEWED / UNCHANGED** | owner excluded as already done | No change |

**Implementation has NOT begun from this audit.** The relevant future Block owner must read its untouched source TXT, this supplemental checklist, existing code/branch PR claims and issue #182; make one isolated work claim **after** first-MVP constraints permit, and implement only genuinely missing requirements. Open docs-only PR to `deepsyq-platform`; do not edit `main`, merge production, turn on provider feature flags or claim external agents were notified.
