# Jarvis release checkpoint — 4 November 2026

Owner explicitly requested audit/correction of DEV b3bf0d21c41f7864d67fe4c0ed93e1d67308ea0e, a compact Studio composer matching the supplied reference, removal of the separate Tour button, verification of the hybrid brain, then test-first deployment followed by the named primary Render service. Prior uncommitted chrome work is being reconciled with this current DEV; no production auto-deploy is enabled.

## Voice ownership and preservation

Service: owner-hosted VoxCPM2, accessed only through the existing test-origin `/api/jarvix/tts` proxy. `/api/jarvix/voice-config` returned `speechModelInstalled:true`, `configured:true`, engine `VoxCPM2` on this session. Inference runs on the owner's previously installed Windows computer/GPU, not a paid provider. AntiGravity exclusively handles recording, transcription, generation and uploading of voice clips. No speech generation was requested in this session. The latest DEV now contains all eight FR/ES tour MP3s; preserve them and use the matching locale suffix. Never expose its private token or source voice recording. Do not run OpenAI or any paid media generation during validation.

## Confirmed audit findings

- Tour imported `resumeJarvisRecognition` without an exported function, preventing module linking.
- FR/ES tour selected RU audio filenames.
- Local Qwen endpoint was hard-coded to Render's own loopback, not the owner's computer, and lacked explicit remote authentication/configuration.
- The preview chat route still used the deterministic brain; production paid routing lacked a trusted request-level entitlement gate.
- Free preview media is a deterministic artifact/audio signal, not proof of real image/video/music model connectivity. Keep paid generation safeguards in place.

The release must report local LLM configuration/connectivity truthfully. Subscriber billing/credit entitlement integration is not proven by this UI or local adapter change.

## Verified test publication

- Render TEST deploy `dep-dblj61vf3r2c73aa5sqg`, exact source `af67c06dffa420af302caa07b34be6d7429b1abd`, LIVE at 2026-11-04 13:30:15 UTC.
- Actual Tools URL shows the shared header/sidebar; clicking the orb enters `is-active is-speaking`, second click removes those classes. Studio composer measured 136 px high in the published browser.
- Local mobile frame verification covered drawer open/Escape and four-language header controls. No live mobile device voice recognition claim.
- Scoped Node checks: 40 release checks plus TEST Studio no-spend/private isolation pass. Additional catalog/speech/language tests pass; legacy core source-string assertions updated to current translation/session names.
- Exact-head CI safety, F4 no-spend/privacy, Jarvis tour, artwork and navigation-related checks sampled green. Other repository checks remain red. In particular final design lock flags an upstream `deepsyq-global-theme.css` hash mismatch (unchanged by this PR); gallery expects the former removed header links; Pricing browser layout assertions also fail. Do not merge the PR or promote this preview to production while relevant release gates remain unresolved.
- Production has not been deployed. No voice clip, source recording, token or transcript was changed. Local LLM connectivity and production subscription/credit metering remain unverified.
