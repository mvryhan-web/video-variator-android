# Deepsyq — $0.99 trial and professional Lumina UX review

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Старые даты **«3 дня», «299 credits», «one-time / no auto-renewal»** ниже сохранены как исторический обзор конкурента/ранней гипотезы и **НЕ одобрены для Deepsyq**. Обязательна покупка за $0.99, но её срок, размер кредитов, продление, refunds и anti-multiple-signup ОТКРЫТЫ; ничего не включать, цены не менять; канон Block 7.


Date: 2026-10-15. Owner reconfirmed the planned **$0.99 entry offer**, then replied **ok go** to a direct question proposing **3-day, one-time, no auto-renewal** terms, and requested a more professional Lumina-inspired navigation/pricing/media experience. Treat that as approval to PREPARE THE OFFER PRESENTATION, **not** a mandate to activate Stripe, assign unpriced credits or launch live sales. The existing owner-approved Deepsyq Home screenshot and `docs/DEEPSYQ_OWNER_APPROVED_HOME_DESIGN.md` remain the non-negotiable visual identity; this document does **not** authorize copying third-party Lumina footage, artwork, UI source, trademarks or entire visual compositions.

## Verified competitor behavior (public research, 15 October 2026)

- Official Lumina pages: `https://ai.byteplus.com/lumina/en` and `https://ai.byteplus.com/lumina/en/ai-app/640888701777377179`.
- Lumina advertises a **one-time, new-customer $0.99 / 3-day Trial**, **299 credits**, no auto-renewal. These are Lumina-specific terms **and are not Deepsyq entitlements**.
- Lumina features strong cinematographic video exemplars with direct user action, dedicated Canvas showcase, AI Agents, AI Apps and data-driven Inspiration with All / Image / Video. Key architectural pattern: inspiring preview → editable task → available model/credit quote → account/checkout before paid generation.
- Reuse UX **principles**: strict brand consistency; clear hierarchy and real media; one prompt bar; obvious category/model selection; strong but honest first-time paid entry; responsive cards; hover/focus states; transparent credit usage. Do not import their media or hard-code model capabilities that Deepsyq hasn't enabled.

## Findings in existing Deepsyq

1. Home already contains a disabled `Trial $0.99` teaser, but `ai-pricing.html` had no Trial at all: broken customer journey.
2. `ai-pricing.css` still used legacy **mint-green** visual identity, inconsistent with approved **violet/blue-magenta** Home.
3. The accessible Stripe connector lists only the `MrRyhan` **TEST-MODE** context with **zero test products/prices**. This does not prove there are no prices in a separate live Stripe account; **production billing not verified**.
4. Existing `/api/ai-billing/config` and `/api/ai-billing/checkout` support server-configured prepaid AI credit packs. The trial does **not** yet have an implemented/tested one-time Checkout + entitlement workflow, and should not be wired to a random existing product price.
5. Home models and Studio consent are separately feature-gated; never imply that paying $0.99 unlocks every inactive model/Agent, or unlimited generation.
6. Existing user Video Uniquifier/Everyday Tools plans and Lifetime entitlements are separate; do not reprice or remove them.

## Delivered (feature branch only)

- Added a visually consistent, prominent `#trialOffer` to `ai-pricing.html`: **$0.99 planned 3-day, one-time, NO auto-renewal**, not purchasable, with an explicit warning that included credits, eligibility checks and Stripe fulfillment remain pending; the checkout stays correctly disabled.
- Changed Pricing typography/cards/background from mint-green to existing dark purple/magenta accent language without altering navigation or product routes.
- Changed Home's dead disabled trial CTA into a functioning `See trial details` navigation to `ai-pricing.html#trialOffer`, without starting checkout or charging.
- Added browser regression for $0.99 messaging, disabled purchase, real navigation, and preservation of existing tools prices/server-configured AI packs.
- No Stripe writes, live billing, credits giveaway, migrations, activation, new routes or user content changes.

## Trial activation — explicitly pending business decisions and testing

Do not enable trial purchases before owner approval of **(a)** exact credit allowance, **(b)** three-day expiry enforcement, **(c)** one-time new-user eligibility and fraud protection, **(d)** a technically verified one-off charge with NO auto-renew, **(e)** provider generation costs and unit economics, **(f)** verified live Stripe account + separate live product/price, **(g)** Checkout success and webhook idempotent credit grants/refunds, **(h)** quote/ledger tests and explicit customer consent, **(i)** compliant paid offer copy and receipt/consumer rights obligations.

Recommend a **one-time, non-renewing $0.99 Starter Pass** concept (NOT yet a confirmed duration/credit grant), for the user's preference to let visitors sample paid AI creation before selecting a fuller plan. Do not copy Lumina's 299 credits blindly. All inactive agent/model/canvas capabilities stay labelled as previews.

## Professional UI acceptance

- Compare desktop and mobile Pricing + Home side-by-side with the owner's exact locked screenshot.
- Real hero/carousel and Inspiration media must come from actual approved owned/licensed video assets, **not static screenshots with play overlays or simulated motion**. 13 reference subjects are documented in `docs/DEEPSYQ_HOME_13_VIDEO_MASTER_SHOTLIST.md`.
- Quick Create drafts may stay free; executing a billable AI model requires real provider available, a server-side quote, approved Stripe purchase/AI wallet and explicit consent.
- No production deployment until owner confirms final look and payments pass test/live gates.

Status: **pricing presentation implemented, trial checkout BLOCKED**, browser CI and visual acceptance pending.

## Follow-up UX/mobile acceptance (2026-10-15)

- Updated the Home preview and Pricing trial to use **three days, $0.99 one time, no automatic renewal** as the planned, explicitly unavailable offer. Do not invent a credit quantity or grant users actual provider usage before economics/Stripe testing. This is not evidence of a successfully configured live payment product.
- Added a dedicated **390px mobile Chromium test** to check layout overflow, visibility of price/terms and the disabled checkout. Targeted Home CI now selects the mobile test. Full run result must be recorded after completion.
- A future enabled checkout should use an owner-approved one-time Stripe Price. Server side must enforce one eligible purchase per identity/payment method per antifraud policy, three-day entitlement expiry, bounded credits and clear refunds; preserve original AI wallet/Stripe webhook idempotency and provider guardrails. Do not manufacture an independent billing subsystem.
