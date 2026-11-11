# JARVIX NEW — isolated implementation (2026-11-11)

## Status
- Branch: `jarvis-new`, based on `deepsyq-platform`. NO production release.
- Open-source source: `vendor/voiceos/`, pinned to
  [AjayRajan05/VoiceOS@54ebf8e](https://github.com/AjayRajan05/VoiceOS/commit/54ebf8e7c3e954eff455efd6a097d3d099d05729).
- Keep upstream `LICENSE` and `NOTICE`; third-party models have independent licenses.
- The commercial WakoAI VoiceOS installer is NOT this repository.
- Upstream includes Windows/macOS/Linux Python host adapters; it does NOT contain
  complete polished Windows `.exe` and macOS `.dmg` desktop installers.
- Existing JARVIX, Cloudflare, Stripe, Pricing, credit balances, and `_worker.js`
  are UNCHANGED. Never deploy `jarvis-new` to the production site.

## First smoke tests
The user's narrowed acceptance suite: (1) one input photo, (2) one generated
image, (3) one generated video, (4) one generated music result. First verify
jobs with no-cost mocks and confirm real provider free quota **before** any
billable API call. Validate both UI and actual output files, not just job IDs.

## Alibaba Model Studio (Singapore)
The DEEPSYQ Cloudflare Worker already references an environment binding
`DASHSCOPE_API_KEY`, but that code reference is not proof that the secret
is present in GitHub Actions or that every listed model is enabled.

`jarvis_new.alibaba` bridges the existing VoiceOS OpenAI-compatible
text transport to the Singapore endpoint using **the same secret name**.
No key is committed or passed to a client browser.

* Default endpoint: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
* Optional dedicated endpoint:
  `https://<workspace>.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`
* Only previously verified FREE text models are eligible. Explicit allowlist,
  free-quota verification and network-enabled gates are required.
* A enabled *catalog label* is not proof of actual generation capability.
* Wan video and music use different APIs and do NOT automatically become free
  when text Chat Completions works.
* Model Studio Stop-on-Exhaust and remaining free balance must be checked
  at provider side. No automatic fallback to paid models.

Local, read-only diagnostic (no secrets printed):
`python -m jarvis_new.launch --check`

To run the existing upstream software after installing its dependencies:
`python -m jarvis_new.launch --provider local --mode hybrid`

To explicitly select the *already configured* Singapore DashScope secret for
the VoiceOS text transport, supply these environment settings on the trusted
host (never embed a secret or put a real key in Git):
- `DASHSCOPE_API_KEY`: pre-existing secret from the protected runtime
- `JARVIX_NEW_USE_ALIBABA=true`
- `JARVIX_NEW_ALLOW_NETWORK=true`
- `JARVIX_NEW_FREE_QUOTA_VERIFIED=true` (only after real provider verification)
- `JARVIX_NEW_FREE_MODEL_ALLOWLIST`: comma-separated, verified eligible TEXT models
- `JARVIX_NEW_TEXT_MODEL`: one name from this verified allowlist
- optional `JARVIX_NEW_ALIBABA_WORKSPACE_ID`

Then `python -m jarvis_new.launch --provider alibaba --mode hybrid`.
This adapter constructs configuration. No live Alibaba call or secret
availability in CI has been claimed.

## Voice
Use existing self-hosted TTS and offline options first. ElevenLabs can be
an optional premium voice adapter later only after evaluating API cost,
limits, rights to use the selected voice, and explicit opt-in. Do not
assume free commercial use.

## Platform coordinator architecture — planned, not yet integrated
One persistent JARVIX task identity for website + desktop; mode-specific
handlers call existing DEEPSYQ tools rather than duplicating them. Desktop
permissions stay on device; sensitive actions require per-user approval.
Full task-history sync and tool-router bindings remain follow-up work.

## Tests
`python -m unittest discover -s tests -p 'test_jarvis_new_*.py' -v`

No WakoAI proprietary binaries or upstream real `.env` / GitHub workflows
have been transferred.
