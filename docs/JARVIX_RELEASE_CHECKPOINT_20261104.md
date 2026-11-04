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
