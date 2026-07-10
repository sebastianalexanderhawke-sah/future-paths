# Identity Brief Migration Audit (Behavior Engine v4, Phase 3)

**Question this audit answers:** is the Identity Brief (v4.2.0,
`src/lib/identity-brief.ts`) complete enough to replace the raw prompt inputs
that Current Self and Future Selves consume today?

**Verdict up front:**

| Feature | Readiness | Blocking items |
| --- | --- | --- |
| Current Self | **Ready on v4.2 + two derivations** | theme-vocabulary map (derive, code-side); extraction→brief sequencing guarantee; mock-mode observation gap |
| Future Selves (narrative layer) | **Not ready on v4.2 — needs v4.3** | per-identity attribution payload (supporting/opposing dimensions + evidence) |
| Future Selves (numeric layer) | **Already equivalent** | rankedFutures is the same engine output |

Nothing was migrated in this phase. No prompts, UI, or generation logic
changed.

---

## 1. Current Self mapping

Input trace: `generateCurrentSelf` (`src/lib/current-self.ts`) →
`runStructuredGeneration(profile: "current_self")` →
`loadCurrentSelfContext` (`src/lib/ai/context/builder.ts:357`) →
`current_self.generate` v10 prompt. Every field that reaches the prompt:

| # | Prompt input today | Source | Identity Brief equivalent | Status |
| --- | --- | --- | --- | --- |
| 1 | `counts` (moments, check-ins) | count queries | `summary.totalObservations`, `summary.breadth`, `summary.maturity`, `stability.metrics` | **Covered** — same purpose (evidence-volume calibration), better resolution |
| 2 | `recentMoments` (title, description, status) | `moments` table | `topSignals[].representativeEvidence` (observation text is written to stand alone), `summary.breadth` | **Derived** — see gap G2 (situation titles) |
| 3 | `currentSelfChosenPaths` (description, themes, future_shift) | `paths` table | Chosen-path text is already an extraction input (`chosenPathDescription` in `behavior_extract`); its behavioral content arrives as ledger observations | **Covered by extraction** |
| 4 | `checkIns` / `currentSelfCheckIns` (theme_changes, identity_impact, reflection Q&A) | `check_ins` table | Check-ins and answered reflections each get their own extraction (`source_type` `check_in` / `reflection_answer`); behavioral content arrives as observations; recency arrives as `trend`/`recentChanges` | **Covered by extraction** — verbatim user voice is lost, see gap G3 |
| 5 | `reflectionQA` override (just-answered reflection, verbatim) | immediate-regeneration flow | Newest-first `representativeEvidence` + `emerged`/`strengthened` groups reflect it — IF extraction runs before the brief is built | **Derived** — sequencing requirement, see gap G4 |
| 6 | `pathThemes` (flattened ThemeName history) | `paths` table | `topSignals` + `signalRelations` (the prompt itself says "do NOT begin from theme tags" — signals are the stronger input) | **Covered/superseded** — but the OUTPUT `themes` field still needs the vocabulary, see gap G1 |
| 7 | `identityUpdates` (title, summary, themes) | AI-generated rows | `recentChanges` + per-signal `trend` (deterministic replacement for "what changed lately") | **Remove** — circular AI feedback |
| 8 | `futureSelves` (name, %, evidence, summary) | AI/engine rows | `rankedFutures` (same engine, structured only) | **Covered** — prose summaries drop out, which is circularity removal, not loss |

**Prompt-derived concepts** (things the prompt asks the model to find in the
raw rows) map more directly to the brief than the raw rows do:

| Portrait concept | Brief field that carries it |
| --- | --- |
| "strongest recurring pattern" | `topSignals[0]` (+ `summary.strongestSignal`) |
| recurring tradeoffs / "what repeatedly wins" (values) | `signalRelations` — the dominant side of a tension IS "what wins when two meaningful things compete" |
| fears / repeated avoidance patterns | negative-direction signals (`avoids_conflict`, `declines_risky_opportunity`, `resists_change`, `defers_to_others`), `recentChanges.dormant`, relations' opposing sides |
| core_tension (both pulls real) | the relation with high combined strength but LOW lopsidedness (both sides evidenced) — directly derivable |
| core_tradeoff (helpful pattern + recurring cost) | strongest `defining`/`established` signal + its relation's opposing side |
| recent_growth ("what's changing") | `recentChanges.emerged` / `.strengthened` + trends |
| evidence / representative situations | `representativeEvidence` (adaptive 2/3/5) |
| confidence / calibration to evidence volume | `summary.maturity`, `stability`, per-signal `confidence` + `stage` |

## 2. Future Selves mapping

Input trace: `generateFutureSelves` (`src/lib/future-selves.ts:344`) →
`recognizeIdentitiesWithAttribution` → `explainIdentities`
(`src/lib/ai/explain-identity.ts`), which builds one prompt block per
identity. (`future_self.discover` + `loadFutureSelfContext` are legacy —
registered but with **no production call site**; excluded from the mapping,
retained per the no-deletions constraint.)

| # | Prompt block field today | Source | Identity Brief equivalent | Status |
| --- | --- | --- | --- | --- |
| 1 | `identity_id`, `Name`, `Description`, `Typical behaviors` | static `identity-library.ts` | Static vocabulary — consumers keep reading the library (same as `SIGNAL_DEFINITIONS`) | **Covered** (not brief data by design) |
| 2 | `Likelihood`, `Confidence`, `Evidence strength` | recognition engine | `rankedFutures[].likelihood/confidence/evidenceStrength` — same engine, same numbers | **Covered exactly** |
| 3 | Supporting dimensions (weight, user score, contribution per dimension) | attribution | `rankedFutures[].matchedDimensions` has the names only — no numeric contributions | **Missing** → G5 |
| 4 | Opposing dimensions (contribution) | attribution | nothing | **Missing** → G5 |
| 5 | Supporting observations (top 5: text + moment title) | attribution | `topSignals[].representativeEvidence` has texts, but not selected per identity, and no moment titles | **Partially missing** → G5, G2 |
| 6 | Opposing observations (top 3: text) | attribution | nothing | **Missing** → G5 |
| 7 | Supporting situations (moment title + observation count) | attribution | per-signal `breadth` counts situations but carries no titles | **Partially missing** → G2, G5 |
| 8 | Regeneration decision inputs (`narrative_source`, stored name, written-at tier) | existing `future_selves` rows | Persistence state, not identity input — stays outside the brief correctly | **Out of scope** (correctly) |

## 3. Gap analysis

Every gap, with the required decision (add / derive / remove):

| Gap | What's missing | Decision | Rationale |
| --- | --- | --- | --- |
| **G1** | ThemeName vocabulary for the portrait's `themes` output field | **Derive** — static signal/dimension→theme map in code | Deterministic, no brief expansion; themes are legacy display vocabulary, not evidence |
| **G2** | Situation (moment) titles — cited today as `(from: <momentTitle>)` in evidence bullets and in `reflectionQA.momentTitle` | **Remove** | The brief must not inspect `moments` (rule 1); adding titles to the ledger would need a migration or a join. The "identity before biography" prompt rule already pushes titles out of everything except evidence, and observation texts are deliberately written to stand alone ("carry the situation and chosen-path context so observations stay readable months later"). Per-signal `breadth` replaces "N situations" framing |
| **G3** | Verbatim user voice: reflection answers, `identity_impact`, moment descriptions | **Remove** | Extraction already distills each of these sources into observations (one extraction per situation / check-in / answered reflection). The portrait prompt explicitly bans quoting the user ("You said it yourself…" is a listed failure). Losing verbatim voice is the intended architecture, but it is a real product decision — flagged for sign-off |
| **G4** | "React to what just happened" (immediate regeneration after an answered reflection) | **Derive** | The brief's newest-first evidence + `emerged`/`strengthened` groups carry it, provided the migration keeps the ordering guarantee: extract → ledger → build brief → generate. Today extraction and Current Self regeneration are parallel side effects; brief-mode makes extraction a prerequisite |
| **G5** | Per-identity attribution: dimension contributions (supporting + opposing, with numbers), supporting/opposing evidence texts, per-identity situation counts | **Add (v4.3)** | The explain-identity prompt cannot write "Why Reflection Believes This" bullets or evidence-steered costs without per-identity evidence. Not derivable from v4.2 fields (topSignals are global, not per-identity). This is the one expansion that is absolutely necessary |
| **G6** | Source-type breakdown (situations vs check-ins vs reflections) — `core_tradeoff` Part 3 references all three | **Add (v4.3, minor)** | One deterministic counter (`summary.sourceCounts`); not derivable because evidence slices only expose top items |
| **G7** | Mock provider produces zero observations (`extractBehaviorObservations` returns `[]` in mock mode) → empty ledger → empty brief in dev/mock | **Add (migration prerequisite, not a brief field)** | Today's mock generators fabricate portraits from raw context, so dev mode works with an empty ledger. Brief-only consumers starve. The mock provider needs a deterministic observation synthesizer before any feature migrates |

Removed-because-no-longer-belongs (no replacement needed): prior
`currentSelf` row, `identityUpdates`, and `futureSelves` summaries as prompt
inputs — all three are earlier AI output being fed back into generation. The
brief replaces their directional role (`recentChanges`, `rankedFutures`)
without the circularity.

## 4. Prompt simulation

### Current Self rebuilt from ONLY the brief

**Simpler.** The prompt's hardest internal step — "identify the tradeoffs this
person repeatedly resolves in the same direction, across otherwise-unrelated
situations" — is precomputed: `signalRelations` hands the model each tension,
which side wins, how lopsided, and with what evidence; `breadth` IS the
"otherwise-unrelated situations" test. Evidence calibration ("build only what
the evidence supports") stops being a judgment call: maturity, stability
band, per-signal stage/confidence are explicit. The context shrinks from
dozens of raw rows (with SQL caps and truncation rules) to one structured
object.

**Impossible.** Quoting or paraphrasing the user's own words. Referencing any
concrete situation by name. Emitting legacy `ThemeName`s without the G1 map.
Reacting to the verbatim text of a just-answered reflection (only its
extracted behavioral content, via G4 sequencing).

**Better.** The portrait's own rules become structurally guaranteed rather
than instruction-enforced: the model *cannot* cite events, jobs, or cities it
never sees, so the "no concrete nouns" and "don't retell what happened" rules
stop depending on model obedience. Circular feedback (prior portrait, AI
identity updates) disappears. Inputs are deterministic → identical ledgers
produce identical prompts (testable, cacheable). Token cost drops.

**Worse.** Extraction becomes the quality ceiling: nuance in long reflection
answers that the extractor didn't distill is gone forever ("hidden belief"
inference now rests on observation texts alone). Sparse-ledger users (early
users; any user whose extractions failed silently) get a thinner portrait
than today, where raw situations/check-ins pad the evidence. Dev/mock mode
is empty until G7 is fixed.

### Future Selves rebuilt from ONLY the brief (v4.2)

**Simpler.** The numeric layer is free: `rankedFutures` is the same engine
output the pipeline computes today. Regeneration triggers
(`evidence_tier_increased`) can be read off brief diffs.

**Impossible (on v4.2).** The entire per-identity evidence block:
dimension contributions, supporting/opposing observations,
supporting-situation counts. `explainIdentities` would be writing narratives
with no evidence to steer them — the "becoming_likely must be traceable to
the supporting observations" rule cannot be satisfied. **This is why v4.3 is
required before this migration.**

**Better (once v4.3 exists).** Trend data the current prompt never sees
(`returned`, `strengthened`) can sharpen narratives; representative evidence
is deduplicated per signal instead of the same observation appearing under
several identities; opposing evidence comes from the same deterministic fold
as everything else.

**Worse.** `(from: <momentTitle>)` attribution disappears (G2 — accepted:
observation texts carry their own context). Situation titles in
"Supporting situations" become counts only.

## 5. Recommended additions — Identity Brief v4.3 (spec only, NOT implemented)

Per the phase constraints ("no implementation beyond the audit"), v4.3 is
specified here and should be implemented only when Future Selves migration
begins:

```
RankedFuture (extended)
├─ supportingDimensions[]   { dimension, identityWeight, userScore, contribution }
├─ opposingDimensions[]     { dimension, contribution }
├─ supportingEvidence[]     RepresentativeEvidence + contribution (top 5)
├─ opposingEvidence[]       RepresentativeEvidence + contribution (top 3)
└─ supportingSituationCount number   (distinct momentIds behind the top evidence)

BriefSummaryMetrics (extended)
└─ sourceCounts             { situation_complete, check_in, reflection_answer }
```

All of it already exists inside `recognizeIdentitiesWithAttribution` — v4.3
re-exposes it through the brief instead of letting consumers call attribution
themselves. No new computation, no migration, still deterministic, still
prose-free (evidence texts are verbatim ledger data, same as today's brief).
Everything else stays v4.2: no other gap justified expansion.

## 6. Migration readiness

**Current Self — ready after three prerequisites, none of which are brief
fields:**
1. G1 static theme map (code-side derivation).
2. G4 sequencing: extraction must complete (and the brief be built) before
   regeneration fires — turn today's parallel side effects into a pipeline.
3. G7 mock-mode observation synthesis, or dev/preview environments lose
   Current Self entirely.
4. Product sign-off on G3 (verbatim user voice never reaches the portrait
   prompt again).

**Future Selves — blocked on v4.3.** The numeric layer is already equivalent;
the narrative layer needs the per-identity attribution payload. Migrate
Current Self first: it validates the brief's evidence quality with the least
prompt surface, while Future Selves keeps consuming attribution directly.

**Order of operations for the next phase:** implement v4.3 → migrate Current
Self (shadow-compare old vs new portraits) → migrate Future Selves narrative
input → only then consider Timeline / Monthly Reflection, which were not
audited here.
