# Cloudflare Worker & Pages Manifest (deepsyq.app)
**Snapshot Timestamp:** 2026-11-10T18:30:00Z  
**Cloudflare Project:** `deepsyq`  
**Active Domains:** `deepsyq.app`, `www.deepsyq.app`  
**Latest Production Deployment:** `8dc5c21f` (Branch: `deepsyq-platform`)  
**Latest Preview Deployment:** `ae0af694` (Branch: `test`, URL: `test.deepsyq.pages.dev`)  

---

## 1. Cloudflare Environment Variables & Secrets (Production)

| Variable / Secret Key | Purpose | Status |
| :--- | :--- | :--- |
| `DASHSCOPE_API_KEY` | Alibaba DashScope Wan 2.6 video model API | Configured & Active |
| `GEMINI_API_KEY` | Google Gemini Flash LLM & AI responses | Configured & Active |
| `OPENAI_API_KEY` | OpenAI fallback LLM | Configured |
| `DATABASE_URL` | PostgreSQL (Neon) primary database | Configured |
| `JARVIX_QUOTA_DATABASE_URL` | Redis / Key-value quota store | Configured |
| `JARVIX_QUOTA_HASH_SECRET` | IP & user quota hashing salt | Configured |
| `JARVIX_VOICE_URL` | Self-hosted TTS / STT speech pipeline endpoint | Configured |
| `JARVIX_VOICE_TOKEN` | Auth token for self-hosted speech server | Configured |
| `GOOGLE_CLIENT_ID` | Google OAuth Login client ID | `637001262243-idtev7ilavp34g3eemqcog9e6tvussd2...` |
| `JARVIX_AI_DISABLE` | Emergency killswitch for external AI | `false` |
| `JARVIX_FREE_LLM_ENABLED` | Allows free tier guest queries | `true` |
| `JARVIX_GEMINI_FREE_TIER_VERIFIED`| Confirms zero-spend Gemini usage | `true` |
| `JARVIX_GROQ_FREE_TIER_VERIFIED`  | Confirms zero-spend Groq usage | `true` |
| `JARVIX_FREE_GLOBAL_DAILY_LIMIT`  | Global safety rate limit | Configured |
| `JARVIX_FREE_IP_DAILY_LIMIT`      | Per-IP safety rate limit | Configured |
| `STRIPE_SECRET_KEY` | Stripe live payment gateway | Configured |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | Configured |
| `STRIPE_PRICE_BASIC` | Stripe price ID for Basic tier | Configured |
| `STRIPE_PRICE_PRO` | Stripe price ID for Pro tier | Configured |
| `STRIPE_PRICE_BUSINESS` | Stripe price ID for Business tier | Configured |
| `STRIPE_PRICE_LIFETIME` | Stripe price ID for Lifetime license | Configured |
| `STRIPE_PRICE_CREDITS_1000` | 1,000 AI Credits pack | Configured |
| `STRIPE_PRICE_CREDITS_10000` | 10,000 AI Credits pack | Configured |
| `STRIPE_PRICE_CREDITS_100000` | 100,000 AI Credits pack | Configured |
| `STRIPE_PRICE_CREDITS_1000000` | 1,000,000 AI Credits pack | Configured |
| `STRIPE_PRICE_CREDITS_10000000`| 10,000,000 AI Credits pack | Configured |

---

## 2. Source Files for Edge Worker & Frontend

- **Worker Core:** `app/src/main/assets/_worker.js` (Compiled by Cloudflare Pages Functions)
- **JARVIX Chat Engine:** `app/src/main/assets/jarvix-chat.js`
- **JARVIX Composer UI:** `app/src/main/assets/jarvix-composer.js`
- **JARVIX Conversations & Storage:** `app/src/main/assets/jarvix-conversations.js`
- **Media Cache & Extension Handler:** `app/src/main/assets/jarvix-result-cache.js`

---

## 3. How Deployments Reach the Live Site

1. **Direct Wrangler Deployment (Active Production Channel):**
   `python scripts/deploy_main.py`
   Uses Cloudflare Pages API credentials to deploy `app/src/main/assets` directly to `deepsyq` project (`deepsyq.app` domain).
   The deployment completes in ~15-20 seconds and changes take effect immediately on `deepsyq.app`.

2. **GitHub Actions (`.github/workflows/deepsyq-surgical-release.yml`):**
   Runs strictly on manual `workflow_dispatch` (not on normal git push). Pushes to `deepsyq-platform` only run local syntax and safety unit tests without touching Cloudflare.
