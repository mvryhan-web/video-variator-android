# BASE #4 — OpenAI GPT Image optional adapter, M0 (NO PAID CALLS)

**Owner scope:** original BASE §4 + Issue #178 (fast Image MVP), Issue #72 Agent A; superseding cost policy Issue #182. PR targets `deepsyq-platform`, not `main`. M0 is an isolated source module and offline tests, NOT an available production feature.

## Existing foundations preserved
- Existing Image Studio, model catalog, BytePlus-first architecture, Google/Seedream providers, centralized B-owned `generation-studio.js` dispatch, job idempotency, storage, authenticated History, D-owned credits/wallet/Stripe, rate policy, and root Home remain untouched.
- No new endpoint or public UI, no OpenAI key, account or customer data committed, no model enabled, no paid QA, no Render or database migration.
- New `server/generation-openai-image.js` is standalone, **not imported or called by current Studio**. Tests use injected in-memory fake fetch exclusively.
- Official Images API: text → image JSON `POST /v1/images/generations`; with supported source photos, multipart `POST /v1/images/edits` and `image[]`. Output `b64_json`, single existing job result `{mime,bytes,text}`. The adapter never follows provider-hosted URLs and never retries an ambiguous paid request.

## Contract and intentionally restricted supported subset

`buildOpenAIImageRequest(request, modelConfig)` accepts the *existing* Image job shape: `kind:'image'`, explicit matched model ID, nonempty prompt up to 2000 chars, chosen aspect ratio, 1K resolution, output format and 0–3 base64 PNG/JPG references. **Only server-controlled approved** `modelConfig.enabled`, `sizes[ratio][resolution]`, `quality`, `formats`, `maxReferences` determine what is actually sent. Example initial internal config (documentation only, **not enabled or priced**):

```js
{
 id: 'gpt-image-2.5-flare', enabled: true, quality: 'low',
 sizes: {'1:1': {'1K': '1024x1024'}},
 formats: ['png'], maxReferences: 0
}
```

This object is a sample of the **adapter input contract**, not a proposed live model registration or consumer price. Extend ratios/references only after official capability + provider quality checks, pricing and user-visible catalog acceptance. Prevent unsupported negative prompt/seed/masks/multiple-output fields from being silently ignored. Output is currently PNG/JPEG only because the existing finalization and download path must agree on MIME. `xhigh/max` are permitted only for documented 2.5 models if the pricing/capability registry explicitly approves them.

**Extra defense:** `generateOpenAIImage()` rejects before any HTTP request without all five trusted server-only flags: confirmed customer payment, reservation of *actually purchased* credits, approved server price, user consent, durable storage ready. These booleans alone do **not prove** payment; actual proof and idempotent reserve/capture/release must be implemented by Agent D's existing ledger integration, never forwarded from the client. No promotional/free/admin credits may cause a paid model dispatch.

**Image/video source fidelity (Etsy):** user-provided photos are references, not a warranty of pixel-perfect AI fidelity. For product advertising, preserve the original visible garment/print/logos/labels and require post-generation human quality control; no invented details, brands or unverifiable fabric claims. Any video generation/edit belongs to Agent B / Product Video Agent C and is NOT provided by this adapter. No product pictures were included in the request to this code PR; there is no authentic generated Etsy MP4 to publish.

## Mandatory next handoffs (unimplemented and blocked)
1. Agent B: review and explicitly authorize a minimal central router/catalog dispatch hook and actual model capability tests **without taking over B-owned files**. Preserve Google/BytePlus and strict provider precedence.
2. Agent D: verify signed customer payment, purchased-credits-only allocation, approved official OpenAI model+size+quality cost, correct quote/reserve/finalize/refund, idempotency and concurrency. Make the paid gate use server ledger results, not caller booleans.
3. Establish and validate production-quality durable S3-compatible private object storage, safe output signature/buffer checks and real authenticated Download/History. Recheck image/content moderation and API model/org entitlement.
4. Run browser/static test through real Image Studio and own-account history using **fixtures** first. M1 real paid API staging smoke is disallowed for owner/agent testing under Issue #182; any live paid provider invocation only for genuine customer-funded, consented production activity after release checks.
5. Agent 5 review, full relevant CI, staging security/recovery and explicit owner approval before considering any `main` merge, public routes, feature flag or production rollout.

## Official docs checked 2026-10-16
- https://developers.openai.com/api/reference/resources/images/methods/generate
- https://developers.openai.com/api/reference/resources/images/methods/edit
- https://developers.openai.com/api/docs/guides/image-generation

**Status:** M0 adapter source & 14 authored offline tests. GitHub CI outcome must be recorded after actual run; **NOT** deployed, commercially active, end-to-end verified or BASE §4 DONE.

## Continued verification (2026-10-16)

Provider API documentation reconfirmed allowed standard sizes for older GPT Image models and custom 16-pixel-multiple sizes for the newer flexible-size models. Adapter now rejects custom sizes for `gpt-image-1.5` even if a server config is mistaken, and rejects provider-reported size/quality mismatches before private storage. Test count **14**. Exact actual GitHub source + the actual authored test bodies evaluated in a contained V8 harness with emulated Node Buffer/FormData/Blob/assert: **14/14 PASS**; GitHub Node CI remains QUEUED and is not represented as passed. No live provider requests.

## Source-matched PNG media-validation hardening (2026-10-17)

The adapter no longer accepts a PNG solely because it starts with the 8-byte PNG signature. Its server-side response/reference validator now requires a standard IHDR chunk, a nonzero bounded width/height and a terminal IEND chunk. This reduces corrupted or spoofed MIME payloads being accepted into a private result. JPEG is also checked for a bounded structural SOF frame, segment lengths and an SOS marker before accepting its EOI; this is still not full codec decoding. Full JPEG decode, PNG CRC validation and independent asset inspection remain provider/storage acceptance requirements. The offline test fixture now uses an actual 1×1 PNG rather than a fake signature-only buffer; the new negative test covers forged signatures, missing IEND and zero dimensions. 

**Evidence:** 15/15 actual authored unit test callbacks executed against actual GitHub source in an isolated V8 harness with emulated Node primitives, **PASS** (NOT real Node CI). Previous exact-head real GitHub Node run [39014059215](https://github.com/mvryhan-web/video-variator-android/actions/runs/39014059215) passed 14/14, before this change. New 15-test exact-head GitHub Node CI outcome still pending. No real provider calls, fees, keys or production activation. 

## CI and media-validation follow-up (2026-10-17)

The source now contains a stricter JPEG marker/size parser and 16 offline authored Node test cases; the last confirmed real GitHub Node run remains the earlier 14/14 PASS at workflow 39014059215. Later 15/16-test sources and the latest exact-head CI are **not** claimed real-Node-verified until that run completes. Current adapter is explicitly **UNWIRED**; payment booleans are not an authentic Stripe ledger, and the module is never authorized to spend owner/agent funds. Required further work: review verified customer-purchased-credit entitlement, server-set approved price, durable private storage, model/quality compatibility and provider capability catalog with B/D. No input media can be claimed pixel-perfect without actual owner-provided source photos and resulting media inspection.

## 2026-10-17 — repaired REAL GitHub CI failure in the existing offline adapter (Agent A)

- Owner 2026-10-17 permit to switch from externally blocked #25 My Creations to an independently scoped A row was recorded in shared claim board, status and Issue #72; this is ONLY original §4 in the SAME existing draft PR #193.
- At exact earlier commit `982603ca2400efc1631a93dfbe4c145aa6decae0`, actual [Node GitHub Actions #39019356787](https://github.com/mvryhan-web/video-variator-android/actions/runs/39019356787) **COMPLETED FAILURE 14/16**: test cases “decode response: reject URL, duplicate, truncated, noncanonical and wrong format” and “multipart reference-image editing reuses actual PNG/JPG files and official form path” threw `INVALID_PROVIDER_MEDIA` and `INVALID_REFERENCES`. The strict JPEG parser itself correctly rejected an INVALID claimed-valid 1×1 source fixture: its declared DQT segment length 67 crossed the next JPEG SOF0 marker, so the parser expected another marker at byte 158 but found non-marker `0x01`. This is a real fixable test-data defect, not a reason to weaken media validation.
- **Remedy only in existing test module**, no implementation weakening: replace the incorrect 1×1 fixture with a genuine 2×2 RGB optimized baseline JPEG encoded and successfully decoded with Pillow offline (284 bytes, SHA-256 `72c93e614ae74ce5211ae911a19a78c1f9b53308b712f3e80fc23532244301dd`). Store base64 in exact-width groups to guard against transcription errors; all 16 previous meaningful positive/negative cases remain. The actual source-extracted `verifyJpegFrame()` accepts the exact 284-byte JPEG; raw prior fixture rejection remains in negative validation tests.
- **Actual evidence:** fixture independently decoded by Pillow; exact source JPEG marker validator accepts the complete corrected bytes in V8. Test JS parse passed. Earlier real Node CI 14/16 failure remains documented; newest GitHub exact-head offline CI [#39044832846](https://github.com/mvryhan-web/video-variator-android/actions/runs/39044832846) was **QUEUED** immediately after the comment-only commit `769d99da8e4e02061759f61a517c6f69085b9c24`, as was Studio preview [#39044832852](https://github.com/mvryhan-web/video-variator-android/actions/runs/39044832852). **Do not claim 16/16 real Node PASS** before terminal green on the final integrated HEAD. No paid API call or production change occurred.
- Remaining whole BASE #4 dependencies are **external and belong to other owners:** Agent B provider-router registration/capability/catalog/real no-spend owner test; Agent D server-verifiable *actual purchased-credit* settlement and customer consent; owner for approved release/cost/staging and media rights; Agent5 for conflict-safe BASE merge and CI admin for queued workers. Booleans in this isolated M0 module do not prove billing. The adapter remains UNWIRED/DRAFT/UNMERGED, not a new provider/router or commerce flow.
