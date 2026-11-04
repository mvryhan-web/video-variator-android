# Jarvis site commands — owner request, 4 November 2026

Persistent public knowledge lives in `jarvix-site-controls.js` and the server's source-derived site map. It does not depend on an LLM conversation remembering these facts.

- 29 named tool workflows, RU/EN/FR/ES aliases, existing public URLs. This includes the owner's spoken alias «комплекс фото» for Compress Photos.
- Specific tools take priority over generic Image/Video navigation.
- Video Uniquifier: Gentle/Balance/Dynamic, 16:9 or 9:16, 720/1080/4K, 1–15 variants. Voice changes dispatch the existing input/change events and respect disabled controls/options. Unsupported or conflicting ratios require clarification; no guessed conversion.
- Existing generic selects and numeric fields can be adjusted by their on-page labels. Reversible tabs and same-origin page links can be selected by exact visible name. Ambiguous, absent or disabled matches do not claim success.
- Pricing: `/api/config` provides current plan prices, currencies and tool allowances. `/api/jarvix/site-map` provides features extracted from the SAME `pricing-page.js` used by Pricing. Trial remains proposed when no authoritative terms exist; AI credits remain separate; test checkout stays disabled.
- The local Qwen and OpenAI context receives the public tool registry. The server site map includes source HTML controls and all registered tools. No private form values enter this knowledge.
- Explicit navigation preserves existing active-session handling. A requested cross-page VU configuration is consumed once, expires in 30 seconds, and does not apply if Jarvis has been stopped.
- No automatic purchases, subscriptions, legal acceptance, file deletion, signatures or generation are added by the new command layer. Existing generation/checkout flows retain their own gates.

## Verification

Node coverage exercises every tool alias and shipped page, mobile-tool coverage, four-language tool routing, compound/ambiguous VU commands, disabled-option preservation, and live-price changes. Existing activation, recognition, navigation, local-LLM and catalog tests remain green.

Browser QA used actual VU controls and Tools routing with a temporary command-input harness, removed before commit. It verified compound settings, disabled count preservation, dynamic Pro pricing, and navigation to `free-tools.html?tool=photo`. Human microphone accuracy is not proven by typed command QA. Existing approved audio bytes, frozen artwork, HTML and CSS are unchanged.
