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

## Coordinator and real upstream VoiceOS tool registry — 2026-11-11
The original VoiceOS source is untouched. The launch entrypoint now loads it
with a **three-tool JARVIX registry extension**: accept task, read status,
and report the owner's real journal state. Tasks are persisted in local SQLite.
Queuing an image/video/music job does **not** create content or charge money.
Computer file operations are never granted automatically to the model.

The local photo-compression module operates on a user-selected file and
writes to an explicitly selected destination, preserving the source. The
mock image/video/music files are marked `SIMULATED`, verified as actual
file formats, and *never* reported as AI generation.

Run `python -m unittest discover -s tests -p 'test_jarvis_new_*.py' -v`
after installing offline test deps. For a tiny independent smoke:
`python -m jarvis_new.coordinator --smoke --workspace /path/to/private/test-folder`.
No external requests are made in that command.

Start the **upstream VoiceOS** CLI with the integrated JARVIX NEW task tools:
`python -m jarvis_new.launch --provider local --mode cli`.
Requires installing the upstream VoiceOS Python requirements and a supported
local LLM. The startup has not yet been accepted on real Windows/macOS machines.

## Windows / macOS desktop companion (source first, 2026-11-11)

There is now a **cross-platform Tkinter desktop companion**, not yet a signed
standalone `.exe` / `.dmg`. It operates on the exact same local SQLite
journal as `jarvix_new_accept_task`, `jarvix_new_task_status`, and
`jarvix_new_task_report` registered into the original VoiceOS registry.

**Windows test run**: clone/open `jarvis-new` and double click
`RUN_JARVIX_NEW_WINDOWS.bat`. Uses a local venv under
`%LOCALAPPDATA%\JARVIX_NEW\venv`; installs only Pillow + imageio-ffmpeg.

**macOS test run**: clone/open `jarvis-new` and run
`RUN_JARVIX_NEW_MAC.command`. Uses a local venv under
`~/Library/Application Support/JARVIX_NEW/venv`. Requires Python 3.10+
with Tkinter. On macOS Gatekeeper and microphone permissions remain OS-controlled.

Optional, bigger voice-engine dependency installation: pass `voice` as
the first command-line argument to the respective launch script. This is
opt-in and may download large dependencies/models. It is NOT needed for
the offline coordinator, local photo compression, task reports or simulated
image/video/music file tests. The user must separately install and configure
a compatible local LLM and speech models to exercise the full voice engine.

The VoiceOS runtime preserves its upstream source untouched but extends
its existing ToolRegistry at bootstrap. A deterministic action-first adapter
can intake one image/video/music creation request and report factual queued,
processing, completed, failed and simulated counts. No automatic provider calls.

**IMPORTANT NOT YET DELIVERED**:
- Real verified AI generation for image, video or music (media above are explicit simulations).
- Guaranteed full audio conversation on physical Windows/macOS microphones.
- Full hosted online task sync between desktop, website and mobile.
- Portable production-ready signed Windows/macOS installers.
- Integration with an automatically controlled Antigravity desktop or live AI provider.
- A working live Alibaba Model Studio key in isolated GitHub Actions.

## Provider safety and current reality

Alibaba's current documentation distinguishes general shared DashScope endpoints
from workspace-dedicated Singapore endpoints. Prefer the correct key's region
and endpoint; a regional mismatch returns authorization errors.

When using free Model Studio credits, the account's **Free Quota Only** mode
must be verified on the provider side before any test. A self-declared Boolean
in our code is not, by itself, evidence that this console setting is enabled.
A provider-specific free quota is not an unlimited lifetime free service.

Source: https://www.alibabacloud.com/help/en/model-studio/new-free-quota
Base URLs: https://www.alibabacloud.com/help/en/model-studio/base-url

## CI evidence (read-only and no paid calls)
- Pinned source vendor import: GitHub Actions run 42988948936.
- 17 passing offline coordinator and VoiceOS registry tests plus four media
  pipeline artifacts: GitHub Actions run 42991252868.
- Windows and macOS compatibility, 2026-11-11:
  GitHub Actions run 42992599348 (both native-smoke jobs success).
- Zero-cost Linux action-first and media smoke tests after the photo intent fix:
  GitHub Actions run 42992599306 (success).

These tests validate import, file formats, Python syntax, per-owner local task
states and safe tool registration. They do not validate a physical microphone,
real Cloudflare site integration, AI media quality, account credentials or
provider billing.
