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
