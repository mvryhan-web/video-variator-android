# BASE #51 — launch readiness checks Image and Video switches

Original BASE requirement §51 includes a working real Image + Video chain. The existing `AI_IMAGE_ENABLED` and `AI_VIDEO_ENABLED` optional kill switches already block new Studio quotes and jobs (PR #87), but owner launch-readiness did not check those switches. An owner could otherwise see a green readiness report while explicitly disabling the two required creation categories.

This minimal, server-side change reuses `generationFeatureSwitches` and adds a required `imageVideo` readiness gate. Explicit `false`, `0`, empty, and invalid case values fail closed exactly as the existing catalog. Unset flags retain their backwards-compatible meaning and are NOT evidence of any actual model credentials, live provider connection, pricing, history or storage. The other readiness gates remain independently mandatory. Disabling BytePlus alone remains permissible when an approved Google provider is configured.

No production toggle, provider request, Stripe operation, database change or Home redesign. This is **CODE-LEVEL gating only**: actual Image + Video paid end-to-end, S3, production backup, signed Stripe and owner deployment permission are still external blockers.
