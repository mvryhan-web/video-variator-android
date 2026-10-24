# BASE #50 — explicit public platform feature flags fail closed

The existing platformFeatureEnabled helper in server/server.js treated ALL non-`false` explicit values as enabled outside production. Operators setting 0, TRUE, empty or a typo accidentally exposed public AI Apps, Inspiration, Product Video or onboarding advertising. Production already required literal true.

The new shared pure helper preserves the previous default for UNSET flags in development, test and preview but disables explicitly invalid/false values everywhere. Only literal `true` enables a configured platform discovery flag. The existing public config API and Express route gates share this one helper.

This scoped patch does not change Image/Video provider routing, paid public generation, Stripe, wallet, owner Home, pricing, secrets, migrations, main, Render or production flags. Full original BASE #50 is PARTIAL pending launch/staging acceptance.
