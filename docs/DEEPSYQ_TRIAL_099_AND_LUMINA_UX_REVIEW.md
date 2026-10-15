# Deepsyq — $0.99 trial and professional Lumina UX review

Date: 2026-10-15. Owner explicitly reconfirmed the planned **$0.99 entry offer** and requested a more professional Lumina-inspired navigation/pricing/media experience. The existing owner-approved Deepsyq Home screenshot and `docs/DEEPSYQ_OWNER_APPROVED_HOME_DESIGN.md` remain the non-negotiable visual identity; this document does **not** authorize copying third-party Lumina footage, artwork, UI source, trademarks or entire visual compositions.

## Verified competitor behavior (public research, 15 October 2026)

- Official Lumina pages: `https://ai.byteplus.com/lumina/en` and `https://ai.byteplus.com/lumina/en/ai-app/640888701777377179`.
- Lumina advertises a **one-time, new-customer $0.99 / 3-day Trial**, **299 credits**, no auto-renewal. These are Lumina-specific terms **and are not Deepsyq entitlements**.
- Lumina features strong cinematographic video exemplars with direct user action, dedicated Canvas showcase, AI Agents, AI Apps and data-driven Inspiration with All / Image / Video. Key architectural pattern: inspiring preview → editable task → available model/credit quote → account/checkout before paid generation.
- Reuse UX **principles**: strict brand consistency; clear hierarchy and real media; one prompt bar; obvious category/model selection; strong but honest first-time paid entry; responsive cards; hover/focus states; transparent credit usage. Do not import their media or hard-code model capabilities that Deepsyq hasn't enabled.

## Findings in existing Deepsyq

1. Home already contains a disabled `Trial $0.99` teaser, but `ai-pricing.html` had no Trial at all: broken customer journey.
2. `ai-pricing.css` still used legacy **mint-green** visual identity, inconsistent with approved **violet/blue-magenta** Home.
3. The accessible Stripe connector lists only the `MrRyhan` **TEST-MODE** context with **zero test products/prices**. This does not prove there are no prices in a separate live Stripe account; **production billing not verified**.
4. Existing `/api/ai-billing/config` and `/api/ai-billing/checkout` support server-configured prepaid AI credit packs. The trial does **not** have an approved one-time Checkout + entitlement workflow, and should not be wired to a random existing product price.
5. Home models and Studio consent are separately feature-gated; never imply that paying $0.99 unlocks every inactive model/Agent, or unlimited generation.
6. Existing user Video Uniquifier/Everyday Tools plans and Lifetime entitlements are separate; do not reprice or remove them.

## Delivered (feature branch only)

- Added a visually consistent, prominent `#trialOffer` to `ai-pricing.html`: **$0.99 PLANNED**, not purchasable, states credits, trial duration, eligibility, renewal and Stripe fulfillment remain unapproved; respects honest disabled checkout.
- Changed Pricing typography/cards/background from mint-green to existing dark purple/magenta accent language without altering navigation or product routes.
- Changed Home's dead disabled trial CTA into a functioning `See trial details` navigation to `ai-pricing.html#trialOffer`, without starting checkout or charging.
- Added browser regression for $0.99 messaging, disabled purchase, real navigation, and preservation of existing tools prices/server-configured AI packs.
- No Stripe writes, live billing, credits giveaway, migrations, activation, new routes or user content changes.

## Trial activation — explicitly pending business decisions and testing

Do not enable trial purchases before owner approval of **(a)** exact credit allowance, **(b)** exact validity period and expiration behavior, **(c)** one-time new-user eligibility and fraud protection, **(d)** no-auto-renew versus clearly disclosed subscription, **(e)** provider generation costs and unit economics, **(f)** verified live Stripe account + separate live product/price, **(g)** Checkout success and webhook idempotent credit grants/refunds, **(h)** quote/ledger tests and explicit customer consent, **(i)** compliant paid offer copy and receipt/consumer rights obligations.

Recommend a **one-time, non-renewing $0.99 Starter Pass** concept (NOT yet a confirmed duration/credit grant), for the user's preference to let visitors sample paid AI creation before selecting a fuller plan. Do not copy Lumina's 299 credits blindly. All inactive agent/model/canvas capabilities stay labelled as previews.

## Professional UI acceptance

- Compare desktop and mobile Pricing + Home side-by-side with the owner's exact locked screenshot.
- Real hero/carousel and Inspiration media must come from actual approved owned/licensed video assets, **not static screenshots with play overlays or simulated motion**. 13 reference subjects are documented in `docs/DEEPSYQ_HOME_13_VIDEO_MASTER_SHOTLIST.md`.
- Quick Create drafts may stay free; executing a billable AI model requires real provider available, a server-side quote, approved Stripe purchase/AI wallet and explicit consent.
- No production deployment until owner confirms final look and payments pass test/live gates.

Status: **pricing presentation implemented, trial checkout BLOCKED**, browser CI and visual acceptance pending.
