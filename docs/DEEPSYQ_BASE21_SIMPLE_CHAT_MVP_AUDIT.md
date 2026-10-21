# Deepsyq BASE #21 — basic AI chat first-MVP readiness audit (2026-10-16)

**Classification:** read-only scope/contract audit, **NOT an implemented chat**, live feature, test of a billable API, or acceptance of the advanced AI Agent. C-owned documentation under Issue #74; product priority from owner Issue #172 and no-paid-test restriction from owner Issue #182. All original BASE / Blocks 1–7 TXT remain unchanged.

## Exact requirements and non-goals

- Original `docs/DEEPSYQ_PLATFORM_SPEC.md` §21 calls for an Agents page and permits initial workflow-based agents, e.g. Product Ad Agent preparing concepts/prompts/images/video. **No honest claim of full Agents is possible without execution.**
- Original `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_2.txt` instead describes an advanced autonomous orchestrator: plans, provider/tool selection, credit estimates, explicit approval, asynchronous execution, resumable jobs, ownership and final assets. **Block 2 is not the first-MVP chat.**
- Owner Issue #172 specifically adds a **smaller conversational assistant** to initial MVP: basic prompt→model response with a separately authorized text model, key isolation, rate/cost constraints, privacy and session UX. Keep original autonomous Agent labeled **Coming Soon**, and do not put a fake active Agent button into the locked Home design.
- Owner Issue #182 supersedes any proposed paid test, free paid dispatch or owner-paid demo budget. **No model call that may create a bill, even for smoke tests, until a real customer has confirmed a successful qualifying purchase and sufficient purchased credits, plus approved price/consent and D-owned server guards.** ChatGPT subscription is not API credit.

## Source inspection (branch `deepsyq-platform`, 2026-10-16)

| Surface | Observed | Chat readiness |
| --- | --- | --- |
| `app/src/main/assets/deepsyq.html` | Navigation shows `AI Agent coming soon`; below Home, Agent section says execution under development. | Honest Coming Soon. Do not change without A-owner design handoff. |
| `app/src/main/assets/deepsyq.js` | Home handles Agent heading as display text. | No chat conversation controller observed. |
| `server/server.js` | JWT-based `auth`, `/api/me`; mounts existing studio/auth/generation services. | No `/api/chat` endpoint found. Do not repurpose legacy auth endpoints. |
| `server/generation-studio.js` | Feature-gated Image/Video/Audio generation, approved catalog and wallet/job APIs. | Not proof of a text/chat provider. Do not sneak conversational requests into image/video routes. |
| `server/generation-provider.js` | Existing media provider abstraction. | No contract proving licensed minimal dialog/text inference or chat-specific pricing. |
| Source tree | No `chat*.html`/JS or chat-specific server module discovered in current checked tree. | Feature **NOT STARTED / BLOCKED**, not live. |

This is a targeted source audit, not exhaustive end-to-end account/provider verification. A model-picker UI alone, or an owner-design mock, is not functioning chat.

## Minimum honest MVP flow and isolated responsibility

1. **Discoverability (C, design review with A):** a dedicated, accessible *Chat* entry only after a real backend is feature-enabled and accepted. Until then, display **Coming Soon** separately from *AI Agent* / *Do it for me*. No prompt field implying a model works when none is authorized. Preserve original Home sidebar/hero and privacy links.
2. **UI scope (C, after API handoff):** prompt/response message list; textarea, Send/Stop and clear/new chat actions; busy/failed/retry-safe states; visible selected authorized model; keyboard focus/live announcement, 320/390px mobile, no secret/client provider SDK. Show chat may be billable only after exact server quote and explicit consent, never a guessed token or cost.
3. **Authentication & API (D/B integration handoff):** keep existing JWT/session and verified user ID; proposed `POST /api/chat/messages` only **after** D/B agree route ownership. Request: `{conversationId?: opaque ID, message: plain string, clientRequestId: random UUID}`; JSON input max length, fixed history cap. Response: `{conversationId, messageId, reply, modelId, usage, status}`, where `usage` is **server-derived**; safe stable error codes with no raw provider exception. Idempotency and same-account conversation ownership mandatory; no cross-user read.
4. **Provider authorization (B + owner):** document a specifically licensed commercially permitted text/chat endpoint and published costs, with key only server-side. Model defaults must be **OFF** until licensed, priced and owner-approved. No outbound API dispatch in disconnected/disabled mode.
5. **Finance/safety (D):** before any potential billable request, enforce signed-in ownership, validated and approved price/currency, spending limits and rate/concurrency limits, correct purchased-only entitlements, consent, idempotency, ledger reserve/capture/release, provider failure isolation and auditable server-only cost. Promotional/trial/admin grants alone must **not** fund billable provider requests. Reject before dispatch when unavailable; never just catch the error after a paid call.
6. **Privacy (D/C review):** prompts/responses may contain personal/business material. Define clear storage lifetime, opt-in/retention/deletion policy and log redaction, authenticated private conversation history, no cross-account/session carryover, and no training-sharing claim without provider terms. Prefer a minimal ephemeral first version unless safe durable storage is approved; don't promise persistent history if it is not implemented.
7. **Guarded rollout (Agent 5 + owner):** do not conflate a mock chat, web search, media Studio, or Block 2 autonomous Agent with first real dialog. Keep the entire feature disabled publicly until independent release approval.

## Suggested safe acceptance without paid models

- **Mock-only API tests:** missing/expired JWT 401; nonexistent/other-owner conversation 404; empty/oversized prompt 400; strict disabled flag 503 with **zero provider calls**; replay of same `clientRequestId` returns same result and never duplicates credit reservation; cancellation or timeout never implies completed billing; HTML injection rendered only as inert text; provider error stripped of sensitive prompt/keys.
- **Zero-cost contract checks:** verify configured endpoint, model ID and pricing schema **without making a model invocation**. Do not invent zero-cost tiers or rely on ChatGPT Plus allowances.
- **UI tests, when implementation is authorized:** mocked authorized chat confirms accessible Send, focus, loading, error and retry; no local secret; 320/390 mobile; sign-out and account switch remove earlier prompts; disabled page explicitly Coming Soon. Validate no POST to paid provider in mock suites.
- **Real usage gate:** signed actual purchased credits, approved provider commercial permission, signed transaction, correct quoted cost, user consent, safe storage and legal/privacy acceptance. Only a **customer-paid** authorized run may count as a commercial end-to-end test under #182. Owner approval required before publication; stage/live must be distinguished.

## Explicit handoffs / blockers

| Owner | Blocking evidence/action |
| --- | --- |
| C (this audit) | This document only, no chat code, new API, placeholder landing page or rewrites of Home/Block 2. |
| B | Determine actual licensed and priced text model/provider capability, full route/safety ownership, no billable dev test; do not assert the media model supports chat. |
| D | Purchased-credit-only execution checks, wallet quote/consent/limits, secure owner conversation authorization and durable design, privacy/retention. |
| A | Review any new Chat entry against owner-approved Home and Agent Coming Soon, without replacing 16:9 hero/carousel. |
| Agent 5 / owner | Assign cross-lane API owner and approve staged launch gate after real evidence; no surprise feature activation. |

**Decision:** the requested minimal chat cannot honestly be marked built or launched from today's repo. The smallest safe next code handoff, only after B/D ownership and free-test policy reconciliation, is an isolated chat UI wired to a **mock** transport plus a server-disabled contract implementation. The original BASE #21 and advanced Block 2 both remain **NOT CODE VERIFIED / NOT LIVE**.

### Links

- [Original BASE #21](../docs/DEEPSYQ_PLATFORM_SPEC.md) (reference from repo root: `docs/DEEPSYQ_PLATFORM_SPEC.md`)
- [Original Block 2](DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_2.txt)
- [Owner staged MVP #172](https://github.com/mvryhan-web/video-variator-android/issues/172)
- [Owner zero-paid-tests #182](https://github.com/mvryhan-web/video-variator-android/issues/182)
- [Agent C claim #74](https://github.com/mvryhan-web/video-variator-android/issues/74)
