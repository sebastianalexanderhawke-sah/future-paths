# Future Paths Project Status

## Current Status

Phase: Phase 7 — AI Identity Engine

Step: Step 1 — AI Paths

Status: Complete

---

## Completed

* Phase 1 Foundation (auth, moments, paths, timeline events)
* Phase 2 Check-In Engine (check-ins, identity updates, homepage)
* Phase 3 Step 1 — Future Selves (mock generator, `/future-selves`, homepage section)
* Phase 3 Step 2 — Current Self (mock generator, single row upsert, `/current-self`, homepage section)
* Phase 4 Step 1 — Identity Prompts (mock generator, `/identity-prompts`, homepage section)
* Phase 4 Step 2 — Contradictions (mock generator, `/contradictions`, homepage section)
* Phase 5 Step 1 — Past Crossroads (three-layer model, `/alternate-selves`, homepage section)
* Phase 6 Step 1 — Timeline (mock generator, `/timeline`, life chapters on overview)
* Phase 7 Step 0 — AI Identity Engine Foundation (provider abstraction, context builder, prompt registry, schemas, usage hooks)
* Phase 7 Step 1 — AI Paths (`paths.ts` uses `runStructuredGeneration` for crossroad generation)

---

## Current Objective

Phase 7 Step 1 is complete. Next: Phase 7 Step 2 — migrate check-in generation.

---

## Next Tasks

1. Wire check-ins to `runStructuredGeneration` with `check_in.generate`
2. Keep mock as default via `IDENTITY_ENGINE_MODE=mock`

---

## Notes

Future Paths is an identity exploration platform.

Homepage route: `/overview` (protected, server-rendered).

**Identity Engine modes:** `mock` (default), `claude`, `auto` (Claude with mock fallback).

**AI migration order:** crossroad → check-in → identity update → future self → current self → identity prompt → contradiction → past path → alternate self → **timeline last**.

Existing `Mock*Draft` types remain canonical output contracts. Path generation is migrated; other domain libs still call mock generators directly until per-generator migration steps.

`timeline_events` remains a separate immutable audit layer.

Apply migrations `00028`–`00030` locally if Timeline tables are not yet applied.

Canonical past model:

Past Crossroad → Alternative Paths → Alternate Self

User-facing label remains **Alternate Selves** at `/alternate-selves`.
