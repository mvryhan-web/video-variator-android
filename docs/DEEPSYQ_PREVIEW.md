# Deepsyq isolated design preview

Purpose: let the owner review the current Deepsyq interface **before** switching production to the new site. Preview reads the same assets in `app/src/main/assets/`; it is **not** a second app/architecture, user database, payment system or AI backend.

## Runtime

- Entrypoint: `npm run preview:deepsyq` (`server/deepsyq-preview.js`).
- `GET /`, `/dashboard`, `/deepsyq.html`: current Deepsyq dashboard with a visible **design preview** warning.
- Other supported static pages include Image/Video/Audio Studio and AI Apps. The owner-cancelled standalone §20 page is removed and both legacy URLs must return HTTP 404 after its verified DEV release.
- Read-only `/api/config` gives display-only plan info with `billingConfigured:false`; `/api/studio/config` advertises the real public model catalog with every model `enabled:false`.
- `/api/templates` returns an empty list until real owner-activated templates can be read safely. **Do not invent generated examples or ready AI workflows.**
- All other API routes, including sign-in, Stripe, wallet writes, AI generation and webhook ingestion, return 503 `PREVIEW_ONLY`.
- No PostgreSQL URL, JWT key, Stripe keys or AI provider credentials should be copied into preview. `X-Robots-Tag` disallows indexing. The preview should not collect accounts or user information.

## Safe separate Render setup (only after owner confirms workspace)

1. Inspect existing services within the owner-confirmed Render workspace; do not change the current production service.
2. Create a new **free** Node web service pointing to the **existing** repository `mvryhan-web/video-variator-android` and **existing** branch `deepsyq-platform`, ideally Frankfurt.
3. Build command: `npm ci --omit=dev --no-audit --no-fund`.
4. Start command: `npm run preview:deepsyq`.
5. Auto-deploy the existing feature branch for visual iterations. Set no database, authentication, payment or provider secrets.
6. Wait until Render reports a live successful deploy. Open its **actual returned service URL** and verify the dashboard, Studio, API safety and mobile display. Do not guess the URL.
7. Run `node --test tests/deepsyq-preview.mjs` with regular CI. This verifies disabled paid endpoints, disabled models and the visual entrypoint, but is not proof of end-to-end paid generation.
8. Before any production launch, follow `docs/AI_PRODUCTION_ROLLOUT.md` and `docs/DEEPSYQ_BASE_CHECKLIST.md`; this preview must never substitute for migrations/provider/worker/payment verification.

## Limitations

This service is intentionally **visual-only**: no usable sign-in, paid AI generation, production user history, Checkout, live purchased templates, or real-time AI billing. Local prompt/reference preparation in Canvas can still be reviewed in the browser. The legacy Video Uniquifier and production Stripe remain hosted on the existing service, unaffected.
