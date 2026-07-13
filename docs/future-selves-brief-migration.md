# Future Selves → Identity Brief migration (Behavior Engine v4, Phase 5)

Future Selves is the second consumer of the shared Identity Brief. The
deterministic layer (selection, likelihood, confidence, attribution) now
comes from `brief.rankedFutures`; the consumer no longer calls recognition
or reads raw observations. The legacy pipeline is intact and one env var
away.

## The migration boundary

| | Legacy | Brief (default) |
| --- | --- | --- |
| Selected by | `FUTURE_SELVES_ENGINE=legacy` | default, or `FUTURE_SELVES_ENGINE=brief` |
| Identity input | full `behavior_observations` load (joined with moment titles) → `recognizeIdentitiesWithAttribution` | `getIdentityBriefForUser` → `rankedFutures` (v4.3 attribution) |
| Narrative prompt | `explainIdentities` (evidence lines cite situation titles + per-situation list) | `explainIdentitiesFromBrief` (same system prompt; evidence without titles, breadth counts instead of the situation list) |
| Count policy | `MAX_FUTURE_SELVES` (5) after dominant-trait dedup | same constant, injected — one policy, one place |
| Persistence/fading/events/regeneration decisions | shared, mode-agnostic (normalized `RecognizedFutureInput`) | shared |

**Automatic legacy fallbacks** (regardless of the flag):
- **Sub-threshold accounts** — when fewer than three identities clear the
  brief's ranking threshold, the minimum-count policy asks recognition for
  its top three *ignoring the threshold*. The brief cannot express that re-run
  (and the consumer may not call recognition), so those accounts stay on
  the legacy path. This is a documented Identity Brief limitation, not a
  consumer workaround.
- **Brief read failure** — generation must not block on the brief.
- An empty ledger returns existing futures untouched, identical to legacy.

## Consumer rule compliance

- Selection is `rankedFutures.slice(0, maxCount)` — a filter/reorder of
  brief data with the display ceiling injected. Dominant-trait dedup happens
  inside the shared recognition core, so `rankedFutures` already carries it.
- Likelihood, confidence, evidence strength, dimension breakdowns, and
  evidence come from the brief verbatim; nothing is recomputed
  (pinned by `future-selves-brief.test.ts`).
- **The one presentation-layer join:** persisted attribution
  (`supporting_observations` / `supporting_situations`) is user-visible —
  the Future Card's "grounded in" list and the evolution story render
  `momentTitle` from it. Titles are display labels, not identity input:
  brief mode looks them up for exactly the momentIds the brief exposed,
  attaches them to the persisted rows, and they never enter the prompt.
- `supporting_situations` in brief mode is a **grouped view of the brief's
  top supporting evidence** (per-situation counts over the exposed top 5),
  not the legacy engine's all-observation aggregate. In practice the leading
  titles coincide (the strongest observations live in the strongest
  situations), but it is a real semantic difference — **v4.4
  recommendation:** re-expose the engine's own `supportingSituations`
  (momentId, contribution, observationCount — no titles) through
  `RankedFuture`, which deletes this grouping.

## Prompt changes

The system prompt is **shared and unchanged** — it was already
explanation-only ("recognized deterministically… your role is strictly
interpretive; never invent identities or adjust numbers"), and the narrative
quality rules (identity-before-biography, worn grooves, distinctness) must
stay identical across modes. What changed is the per-identity input block:

- evidence lines no longer carry `(from: <situation title>)`;
- the "Supporting situations" list is replaced by uncapped breadth counts
  ("observed across N distinct situations", "top X of Y total");
- everything is read from `RankedFuture`, so a narrative regeneration
  consumes zero raw rows.

Measured on a 5-identity established persona: user prompt 13,672 → 10,692
chars (**−21.8%**, ≈745 fewer input tokens per narrative batch). The system
prompt (the bulk of the request, ~14k chars) is unchanged and
cache-eligible; narrative regenerations are rare by design (new identity,
fallback repair, rename, format upgrade), so the bigger win is architectural,
not cost.

## Shadow validation

- The deterministic layer is equal by construction — `rankedFutures` *is*
  the recognition output, pinned by the v4.3 parity test.
- `FUTURE_SELVES_SHADOW_COMPARE=true` (non-production): brief-mode runs also
  execute legacy recognition read-only and log `[future-selves-shadow]`
  with per-identity likelihood/confidence/evidence-count side-by-sides.
  No AI call, no persistence.
- Narrative-quality comparison requires an API key: generate on a populated
  dev account under each engine (flip `FUTURE_SELVES_ENGINE`) and compare
  cards for evidence grounding (becoming_likely bullets still traceable),
  diversity of futures, and emotional register. Expected difference:
  becoming_likely bullets ground themselves in behavior text alone rather
  than situation names — the identity-before-biography rule already pushed
  titles out of every other field.

## Validation status

- 811 tests pass; the legacy suite (`future-selves.test.ts`) runs pinned to
  `FUTURE_SELVES_ENGINE=legacy` and is otherwise untouched.
- Brief mode end-to-end (mock provider): selection → normalization → title
  labels → persistence with UI-contract fields, single ledger read, no
  recognition call, no `moments(title)` join.
- The deterministic persona audit (`scripts/audit-identity-engine.ts`)
  exercises recognition, which this phase did not touch.
- Live narrative comparison on real accounts remains a runbook step (above).
