# Deepsyq — generation unit-economics snapshot

**Snapshot date:** 2026-10-20  
**Scope:** no-spend planning only. No provider calls, Stripe reads/writes, real payments, secret access, or deployment. These published list rates are not account-specific quotes or an enablement approval.

## Current code catalog (DEV)

The catalog source is `app/src/main/assets/generate-models.js` (blob `26631bb1a3dc7a0b2afe8e0810f274ab42294572` at review). It contains:

| Kind | Catalog model | Provider | Cost status |
| --- | --- | --- | --- |
| Image | Nano Banana 2 (`gemini-3.1-flash-image`) | Google | Published Google rate found; no free API tier |
| Image | Seedream 4.5 (`seedream-4-5-251128`) | BytePlus | Published unit rate found; confirm account/region SKU before enabling |
| Image | Seedream 5.0 Lite (`seedream-5-0-260128`) | BytePlus | **BLOCKED:** exact official unit price not verified in this snapshot |
| Video | Veo 3.1 Lite (`veo-3.1-lite-generate-preview`) | Google | Published rate found, but model is scheduled to shut down **2026-10-22**; do not use it as the merged product's stable offer |
| Video | Seedance 2.0 (`dreamina-seedance-2-0-260128`) | BytePlus | Published 5-second reference points found; actual token use varies by request; reference-input rates need a matching quote |
| Music | Lyria 3 Clip, 30 seconds (`lyria-3-clip-preview`) | Google | Published per-song rate found; no free API tier |
| Voice | Google AI Voice / Seed Speech | Google / BytePlus | Adapter is marked disconnected in the catalog; exclude from priced offers until connected and costed |

These are catalog entries, **not proof that a model is enabled or live**. The Studio's actual runtime feature flags and provider credentials determine availability.

## Published direct-cost reference points

Prices are USD and are direct provider list prices only, before payment fees, tax/VAT, FX, storage/egress, failed-job overhead, and support.

| Model and configuration | Published direct cost | Minimum net sale for D18's 2:1 floor | Notes |
| --- | ---: | ---: | --- |
| Seedream 4.5, one output image | $0.040 | $0.080 | Use only after confirming the customer's region, SKU, and current account rate |
| Nano Banana 2, 1K / 2K / 4K | $0.067 / $0.101 / $0.151 | $0.134 / $0.202 / $0.302 | Input-token charges can add to the output-image rate; no API free tier |
| Seedance 2.0, 5 sec, 16:9, text-to-video, 480p / 720p / 1080p / 4K | $0.35 / $0.76 / $1.87 / $3.89 | $0.70 / $1.52 / $3.74 / $7.78 | Official table's 5-sec examples; do not extrapolate as an exact rate for other duration, ratio, or reference-input modes |
| Veo 3.1 Lite, 720p / 1080p, 8 sec | $0.40 / $0.64 | $0.80 / $1.28 | $0.05 / $0.08 per second; unstable because shutdown is scheduled for 2026-10-22 |
| Lyria 3 Clip, 30-sec song | $0.040 | $0.080 | Input text and other delivery costs may add |

**Important for token-metered video:** BytePlus documents the listed Seedance values as estimates/minimum token consumption and says actual usage is determined by returned completion-token usage. The pre-dispatch quote must use a provider quote or a defensible maximum bound for the selected duration/resolution/input; a five-second example alone cannot guarantee the 2:1 floor. If no safe bound/quote exists, keep that model-option unavailable until a safe settle/charge contract is implemented.

## What the existing monthly price points could support (upper bounds only)

The legacy Video Uniquifier plan amounts in DEV are Basic **$9**, Pro **$24**, Business **$99**. Their existing video-tool allowances are **not** AI-generation credit grants. The tracked AI subscription-credit mechanism is optional and disabled unless configured; no approved AI credit counts were found in tracked source. Trial remains **$0.99** and is not activated by this document; Lifetime remains separate.

For illustration only, at the strict D18 floor half of net plan proceeds is the maximum direct generation-cost budget. The following upper bounds assume the *entire* plan price goes to a single generation type, with no Stripe fee, VAT, FX, other variable cost, or non-AI feature cost. Actual grantable quotas must be lower after those deductions and must be one coherent mixed-model credit budget.

| Legacy monthly amount | Direct-cost ceiling at 2:1 (before deductions) | Seedream 4.5 images at $0.04 | Nano Banana 2 1K images at $0.067 | Lyria songs at $0.04 | Seedance 2.0 5-sec 720p clips at $0.76 | Seedance 2.0 5-sec 1080p clips at $1.87 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Basic $9 | $4.50 | 112 | 67 | 112 | 5 | 2 |
| Pro $24 | $12.00 | 300 | 179 | 300 | 15 | 6 |
| Business $99 | $49.50 | 1,237 | 738 | 1,237 | 65 | 26 |

These are **not proposed customer quotas or new prices**. They make clear why a single unweighted “one credit per generation” policy or unlimited video cannot safely be attached to old plans.

## Pricing formula and unresolved inputs

For each successful job, use:

`customer net revenue allocated to job >= 2 × (provider charge + other direct variable delivery costs)`

Customer net revenue excludes collected tax/VAT and subtracts allocated payment-processing / FX fees. Provider cost must use the real provider/model/region and all cost-affecting options. Convert USD/EUR using a recorded FX rate and rounding buffer. Reserve the maximum safe credit amount before dispatch; consume on success and release/refund on failure. Compare actual invoice/usage cost to the estimate and revise the rate table on variance.

Before assigning new Basic/Pro/Business amounts or monthly grants, still need:
1. Verified account/region price for every selected provider model and option, including seedream-5-lite and reference video modes.
2. A model-stable replacement for the soon-to-retire Veo 3.1 Lite (or remove it from the future offer).
3. Payment fee/tax/VAT/FX assumptions for the chosen sale currency and buyer region.
4. The per-credit monetary conversion and the intended monthly AI credit allocations for the three tiers.
5. A realistic, capped per-user usage mix and a confirmed max-cost/settlement rule for dynamic video.
6. Owner's final exact new prices and grandfathering/migration decision for existing subscriptions.

## Official pricing sources checked 2026-10-20

- Google Gemini API pricing (Nano Banana 2, Veo 3.1 Lite, Lyria 3 Clip; includes free-tier availability and Veo retirement notice): https://ai.google.dev/gemini-api/docs/pricing
- BytePlus ModelArk pricing (Seedance 2.0 tables and Seedream rates): https://docs.byteplus.com/en/docs/modelark/model-pricing?redirect=1
- BytePlus Image generation API (supported models/options): https://docs.byteplus.com/en/docs/modelark/image-generation-api?redirect=1

**Status:** cost reference points and formula documented; provider account quotes, AI tier grants, new tier prices, and live Stripe configuration remain unverified/unchanged. This file does not authorize any provider call, payment, or deployment.
