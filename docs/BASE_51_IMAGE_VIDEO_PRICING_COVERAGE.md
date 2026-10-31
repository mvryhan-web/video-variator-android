# BASE #51 — Both Image and Video require approved pricing before commercial readiness

Original BASE #51 requires the first commercial flow to support Image and Video generation, a priced credit wallet and charged jobs. Owner readiness previously checked only that some AI price existed and some AI credit rate existed. An Image-only price/rate catalog could therefore report `launchReady: true` even though no Video generation had an approved credit price, or vice versa.

This bounded fix introduces a separate required readiness gate `imageVideoPricing`. It requires at least one server-approved, parse-valid `AI_MODEL_PRICING_JSON` row and one approved `AI_CREDIT_RATES_JSON` kind entry for **each** kind `image` and `video`. All original readiness prerequisites remain mandatory, including explicit currency for every priced model, image/video kill switches, provider keys, wallet and signed billing configuration. This check is intentionally **necessary but not sufficient**: matching exact model availability and live provider/owner economics, history/download, storage, signed payment and real staging acceptance are not proven by config alone.

The existing focused readiness tests include image-only, video-only, absent price/rate and unaffected kill-switch cases; prior full successful fixture now includes approved synthetic test values for both kinds. No invented real rates, no customer-visible promises and no changes to ledger, Stripe, providers, Home, `main`, Render or production DB.

Original BASE #51 stays PARTIAL until genuine owner-approved Image+Video commercial end-to-end, live provider economics, database backup/staging and physical mobile/regression acceptance.
## Owner preflight must mirror Studio prerequisites

The existing Studio config refuses to start when `ADMIN_EMAIL` is absent or `AI_STUDIO_MAX_CALLS` is not a bounded integer 1–20, and enables only creation types explicitly present in the comma-separated `AI_STUDIO_ALLOWED_KINDS`. Earlier `generationReadiness().launchReady` did not check these, so it could falsely say ready while **both** required create types were actually unavailable.

Required independent `studioOperator` and `imageVideoKinds` readiness gates now require owner/call-limit prerequisites and explicit `image,video` kind coverage. The gate intentionally follows current exact Studio separator behavior: `image, video` with a space is not the same as `image,video`. The old `studioEnabled` public flag guard and every pre-existing commercial gate remain. This is still necessary configuration only, not proof of live enabled model keys, quota, Stripe, storage, pricing, provider response or mobile UX.

Unit regression cases cover absent owner, invalid/oversized call limits, missing Image or Video in the allowed list, ordering and the combined ready-fixture. Provider dispatch and Home remain owned by other agents. No new public generation flags are set.