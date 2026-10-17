# BASE #51 — Studio rollout readiness

Owner's original BASE TXT §51 requires users to enter an enabled Studio and complete Image/Video paid generation. Existing owner readiness checked provider credentials, wallets, approved prices and the global public flag, but did not require `AI_STUDIO_ENABLED=true`. Operators could receive a structurally green readiness result even when Studio itself was switched off. This is a configuration consistency bug, not confirmation of any production provider.

A new **required** `studioEnabled` readiness gate reuses the existing Studio toggle without modifying that toggle, route code, credentials or customer UI. Only the literal `true` satisfies the gate. All other required production checks remain. The existing baseline positive unit fixture has been amended to turn Studio on explicitly, and negative cases verify missing and invalid values fail closed.

No paid API calls, database changes, Stripe events, Render deployment or Home design change. Do not call the platform production-ready until actual signed payment and Image/Video tests pass.
