# WOW Montage stage 4 — local result preview

Adds Preview beside Download/Share for completed WOW outputs in the existing history. Applied, skipped and standard-fallback outputs can all be reviewed. Existing automatic saving to Android Gallery/Movies/VideoUniquifier and browser Downloads is retained. Preview itself neither saves, encodes nor charges again; its explicit Download/Share actions delegate to existing implementations.

The player preserves aspect ratio, uses native controls and playsinline, never auto-plays, and is contained in a responsive modal dialog. Closing or replacing the preview pauses playback, removes the source and revokes its object URL. Errors during explicit save/share are visible and retryable; cancelled sharing is quiet. WOW metadata is retained with local persisted history and media, allowing preview after reload. The WOW switch is locked while processing to avoid changing/resetting result summaries mid-job.

No video-core or WOW render algorithms, pricing, authentication, package ID or production environment changed. Production rollout remains blocked pending stage 5 tests and owner approval.

Validation: existing 37 local baseline/media/engine tests, plus browser tests for local preview lifecycle, geometry at 320/390/768 widths, explicit save/share, error handling, busy toggle and completed output/history reload. Browser tests use stub output for UI integration; actual FFmpeg/WASM rendering remains covered by stage 3 tests. Physical Android/iPhone playback and stage 5 performance checks remain required.
