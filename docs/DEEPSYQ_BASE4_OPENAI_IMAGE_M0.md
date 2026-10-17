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

The adapter no longer accepts a PNG solely because it starts with the 8-byte PNG signature. Its server-side response/reference validator now requires a standard IHDR chunk, a nonzero bounded width/height and a terminal IEND chunk. This reduces corrupted or spoofed MIME payloads being accepted into a private result. JPEG currently remains checked by signature/EOI only; full codec decoding/CRC/asset validation remains a further provider/storage acceptance requirement. The offline test fixture now uses an actual 1×1 PNG rather than a fake signature-only buffer; the new negative test covers forged signatures, missing IEND and zero dimensions. 

**Evidence:** 15/15 actual authored unit test callbacks executed against actual GitHub source in an isolated V8 harness with emulated Node primitives, **PASS** (NOT real Node CI). Previous exact-head real GitHub Node run [39014059215](https://github.com/mvryhan-web/video-variator-android/actions/runs/39014059215) passed 14/14, before this change. New 15-test exact-head GitHub Node CI outcome still pending. No real provider calls, fees, keys or production activation. 
