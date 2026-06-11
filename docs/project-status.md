# Future Paths Project Status

## Current Status

Phase: Phase 7 — AI Identity Engine

Step: Step 9 — AI Timeline

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
* Phase 7 Step 2 — AI Check-ins (`check-ins.ts` uses `runStructuredGeneration` for check-in generation)
* Phase 7 Step 3 — AI Identity Updates (`identity-updates.ts` uses `runStructuredGeneration` for identity update generation)
* Phase 7 Step 4 — AI Future Selves (`future-selves.ts` uses `runStructuredGeneration` for future self discovery)
* Phase 7 Step 5 — AI Current Self (`current-self.ts` uses `runStructuredGeneration` for current self generation)
* Phase 7 Step 6 — AI Identity Prompts (`identity-prompts.ts` uses `runStructuredGeneration` for identity prompt generation)
* Phase 7 Step 7 — AI Contradictions (`contradictions.ts` uses `runStructuredGeneration` for contradiction detection)
* Phase 7 Step 8A — AI Past Alternative Paths (`past-crossroads.ts` `generateAlternativePaths()` uses `runStructuredGeneration`)
* Phase 7 Step 8B — AI Alternate Self (`past-crossroads.ts` `generateAlternateSelf()` uses `runStructuredGeneration`)
* Phase 7 Step 9 — AI Timeline (`life-chapters.ts` `generateTimeline()` uses `runStructuredGeneration`)

---

## Current Objective

Phase 7 AI Identity Engine migration is complete. All domain generators now route through `runStructuredGeneration`.

---

## Next Tasks

1. Phase 8 planning (if applicable)
2. Keep mock as default via `IDENTITY_ENGINE_MODE=mock`

---

## Notes

Future Paths is an identity exploration platform.

Homepage route: `/overview` (protected, server-rendered).

**Identity Engine modes:** `mock` (default), `claude`, `auto` (Claude with mock fallback).

**AI migration order:** crossroad → check-in → identity update → future self → current self → identity prompt → contradiction → past path → alternate self → **timeline last**.

Existing `Mock*Draft` types remain canonical output contracts. All Phase 7 domain generators are migrated; mock mode still uses mock generators via `mock-router.ts`.

`timeline_events` remains a separate immutable audit layer.

Apply migrations `00028`–`00030` locally if Timeline tables are not yet applied.

Canonical past model:

Past Crossroad → Alternative Paths → Alternate Self

User-facing label remains **Alternate Selves** at `/alternate-selves`.
