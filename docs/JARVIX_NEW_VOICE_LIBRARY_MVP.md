# JARVIX NEW — 552 MP3 physical recovery and TEST deployment (2026-11-11)

- From the GitHub tree of branch `jarvis-new`, verified **552 actual
  MP3 files** under `app/src/main/assets/media/jarvix/`:
  344 numbered legacy recordings (`jarvix_{lang}_01..86.mp3`),
  192 Tour V3 (`t3_{lang}_*.mp3`), and 16 extra tour clips.
  This is physical repository inventory, NOT confirmed R2 inventory.
- The owner was previously given 392 MP3 (200 numbered clips + 192 Tour V3).
  We packaged the other **160 existing MP3** via GitHub Actions
  `.github/workflows/jarvis-new-extra-mp3.yml`, run:
  https://github.com/mvryhan-web/video-variator-android/actions/runs/43089586057
  and verified their SHA256 integrity.
- Combined 552 real MP3 into a Windows-friendly, Python 3 package
  `JARVIX_Voice_Library_0.4_552_MP3.zip` available from the current
  ChatGPT conversation. No recorded audio was regenerated. Source
  language distribution: 138 recordings each (RU, EN, FR, ES).
  New 160 have unverified transcripts and are intentionally NOT allowed
  for automatic speech replies until owner reviews/approves them.
- Python archive tests: **17 local unit tests passing**. ZIP integrity
  verified, MP3 count verified, SHA256 import and no duplication confirmed.
  The app is a Python+Tkinter project requiring Python 3; it is **not**
  a signed Windows EXE.
- Created physically grounded test static inventory
  `app/src/main/assets/jarvix-new-physical-audio-index.json`.
  Only confirmed existing MP3 URLs may be offered by
  `jarvix-new-recorded-dialog.js`. Missing `s###` files in the
  500-scenario catalog are no longer attempted.
  Changes published successfully **TEST-only** to
  https://jarvis-new.deepsyq.pages.dev/
  GitHub Actions: https://github.com/mvryhan-web/video-variator-android/actions/runs/43090437892.
- Cloudflare R2 **still returns HTTP 403** on REST bucket listing with
  the current Pages API token. The R2 read-only inventory workflow
  `.github/workflows/jarvis-new-r2-inventory.yml` is working but
  requires a separate `CLOUDFLARE_R2_READ_TOKEN` GitHub Actions secret
  with Workers R2 Storage Read permissions. Do not presume R2 is empty.
  No Cloudflare R2 objects were changed or listed.
- Production `https://deepsyq.app` and old JARVIX were not modified.
  Paid LLM routing and voice synthesis for arbitrary novel responses
  are **not live**. The free demo currently uses only available audio
  and the local owner's optional approved library; a generic spoken
  free LLM answer is NOT available from 552 fixed MP3 alone.

---

# R2 access checkpoint — 2026-11-11 20:08 Paris time

- Read-only inventory action: `.github/workflows/jarvis-new-r2-inventory.yml`.
- Verified the syntax fix by actual GitHub Actions execution; the original
  `IndentationError` is resolved.
- Latest run: https://github.com/mvryhan-web/video-variator-android/actions/runs/43084417663
  now fails at Cloudflare R2 REST `GET /accounts/{account}/r2/buckets`
  with HTTP **403 Forbidden**. This is an R2 permission problem, not missing MP3.
- Dedicated, least-privilege GitHub Actions secret already supported:
  `CLOUDFLARE_R2_READ_TOKEN`. Its token needs Cloudflare API permission
  **Workers R2 Storage Read** for the account. Keep existing Cloudflare
  Pages deploy token unchanged. Do not paste the secret into chat or git.
- After saving the secret in GitHub Settings > Secrets and variables >
  Actions, re-run the action using workflow_dispatch. It will list bucket
  object names and compare the 1900-entry manifest to actual R2 keys,
  without uploading, changing or deleting anything.
- Without that read permission we cannot honestly state how many MP3
  are present in R2. The locally shipped 392 MP3 remain intact.
- A separate JARVIX NEW preview deployment completed successfully at
  https://github.com/mvryhan-web/video-variator-android/actions/runs/43080452576.
  No changes were made to production or the legacy JARVIX.

---

# JARVIX NEW Voice Library — current package 0.3 (2026-11-11)

The owner can download `JARVIX_Voice_Library_0.3_392_MP3_R2.zip` in
this ChatGPT conversation. The ZIP contains **392 SHA256-verified MP3**
(200 legacy + 192 Tour V3), unapproved draft transcripts, 4 languages,
the local desktop library and read-only API. It passed **16 offline tests**.
The ZIP has been verified for archive integrity; this is still a Python
project requiring Python 3 on Windows, not a native signed EXE.

The new `CHECK_R2_WINDOWS.bat` is **READ ONLY**. With environment variables
`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` having R2 read permission,
it scans all prefixes and outputs actual Cloudflare R2 MP3 counts.
A different S3 Object Read key + `R2_BUCKET` + optional boto3 are required
to download *additional* R2 recordings into the local program; no R2 writes.

The test-branch GitHub Action
`.github/workflows/jarvis-new-r2-inventory.yml` has now been corrected
to parse Cloudflare R2 `result: []` and `result_info.cursor`, not the
previously incorrect `result.objects`. It also searches all folders and
reports matches against existing repository manifest filenames. Execution
and Cloudflare read permissions are NOT confirmed by the ChatGPT client.
Neither R2 storage nor the full 1900 MP3 has been independently verified.

The MP3 library provides audio only for previously reviewed matching
recordings; it does NOT replace an LLM for novel factual answers. The
existing test JARVIX sphere queries hosted recordings, then local owner's
approved library, and finally local Ollama text. Paid model access is
NOT active, and production DEEPSYQ / old JARVIX were not modified.

---

# JARVIX NEW — owner MP3 Voice Library MVP (TEST only, 2026-11-11)

## Delivered
The owner received a downloadable Windows-friendly Python ZIP named
`JARVIX_Voice_Library_MVP.zip` in the ChatGPT conversation. Its source has
not yet been imported into this Git repository.

The prototype uses only free/local components:
- SQLite index of real owner MP3 files and explicitly reviewed transcripts
- optional faster-whisper word-level alignment, run once during library prep
- FFmpeg audio trimming and crossfade of individually reviewed words
- Tkinter desktop window: import files/folders/ZIP, review, search, assemble
- read-only Cloudflare R2 audit and opt-in import; bucket contents must be
  verified, not assumed from a stale 1,900-file JSON manifest
- optional original owner VoxCPM2 `resume_2000.py` batch restorer; requires
  running local server and explicit click, NEVER a live per-user synthesis call
- localhost-only HTTP adapter on 127.0.0.1:8770, strict TEST browser Origin
- local no-cost tests: 11 passing; no real Windows hardware test yet

The existing JARVIX NEW test sphere now tries its hosted prerecorded MP3
catalog, then optional locally running Voice Library at 127.0.0.1:8770,
then local Ollama text-only if no suitable prerecorded answer exists.
No browser SpeechSynthesis/TTS is used in this test configuration.

## R2 evidence and missing MP3
The repository contains a 1,900-entry manifest and a 500-scenario textual
master, but many referenced `jarvix_ru_s###.mp3` files were not found at
the expected paths. Older `jarvix_ru_01.mp3` files DO exist; these have
different names and cannot be automatically assigned fabricated transcripts.
Actual contents of Cloudflare R2 are UNKNOWN until a read-only inspection
with permissions to list buckets/objects succeeds.
Test-only read-only inventory action:
`.github/workflows/jarvis-new-r2-inventory.yml`.

## Owner-approved free/paid design
FREE: verified prerecorded MP3 answers only, zero paid AI per reply;
rate limit on server, not in browser. No arbitrary audio substitution.

BASIC/PRO/BUSINESS: after trusted server-side session, ACTIVE paid
subscription AND credit/budget check, route to an explicitly allowed paid
model, then synthesize/assemble approved owner's voice if the technology
can accurately do so. A 1,900-MP3 corpus alone does NOT guarantee natural
arbitrary new sentences. Do not call paid models from the browser, trust
client plan flags, expose Stripe or Cloudflare keys, or claim billing is live.

For general site visitors, a desktop program on the OWNER's PC is NOT
sufficient. Next phase is a server-side indexed demo using existing R2
objects, with short-lived signed audio delivery and read-only Worker binding.
The production deepsyq.app and old JARVIX must stay unchanged. Publish
only to TEST until specifically authorized for this new feature.
