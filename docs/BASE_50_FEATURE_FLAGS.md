# BASE #50: per-generation feature kill switches

Source: owner original `docs/DEEPSYQ_PLATFORM_SPEC.md` §50; scoped to the existing Studio model catalog; no second router, auth service, wallet, database migration or UI redesign.

The global public AI gate `AI_PUBLIC_GENERATION_ENABLED` remains OFF until a separately approved launch. Existing Studio/AI Apps/billing flags are preserved. Three **optional** operational switches additionally control **new** Studio requests:

- `AI_IMAGE_ENABLED=false`: disable Image models.
- `AI_VIDEO_ENABLED=false`: disable Video models.
- `BYTEPLUS_ENABLED=false`: disable BytePlus model requests while retaining configured Google models.

**Compatibility:** When not defined, each switch inherits the preexisting Studio configuration; this avoids silently breaking any current owner's pilot. If defined, only the literal string `true` permits new jobs for the corresponding kind/provider. Explicit `false`, blank, `0`, `TRUE`, or an unrecognized value fail closed. These flags are not an independent permission bypass: original Studio availability, specific provider keys, allowed kinds/models, explicit quote, authenticated credits, entitlements and rate limits still apply. Studio `/api/studio/config` exposes only the three safe boolean switch statuses (never secrets). No new job or price can be requested from a disabled catalog model, including through Smart model routing.

**Important safety:** an operator kill switch MUST NOT remove a user's existing History, stop already-submitted async polling, silently refund/capture wallet reservations, or cancel paid provider tasks. These switches are checked when constructing the model catalog for new estimate/create only; recovery, history and settlement paths use their existing owner-scoped guards.

Targeted tests exercise invalid/unset flags, separation of providers/kinds, and real HTTP denial of a new Video estimate and job before DB or provider calls. **Code-level validation is not a real paid-provider or public rollout test.** Keep `main` and Render settings unchanged until owner approves release safety gates.
