# The Identity Brief

**Status: two consumers live (Behavior Engine v4, phase 5). Current Self
(`CURRENT_SELF_ENGINE`, docs/current-self-brief-migration.md) and Future
Selves (`FUTURE_SELVES_ENGINE`, docs/future-selves-brief-migration.md)
generate from the brief by default. Timeline and Monthly Reflection still
use the legacy pipeline.**

The Identity Brief is the shared structured payload that every future AI
feature will consume. Once migration completes it is the single source of
truth for identity: **any feature that needs identity reads the brief instead
of rebuilding identity from raw history.** Future implementation phases should
treat the brief as the only identity input available.

- Builder: `buildIdentityBrief(observations)` in `src/lib/identity-brief.ts`
- Ledger it folds: `src/lib/behavior-ledger.ts` (Behavior Engine v4, phase 1)
- Contract tests: `src/lib/identity-brief.test.ts`

## The three rules

1. **Ledger in, brief out.** The brief is generated entirely from the
   Behavior Ledger — `behavior_observations` rows (Layer 0) folded through
   the ledger's SignalState machinery. It never inspects situations,
   check-ins, or reflections directly, and neither should any consumer.

2. **Deterministic.** The brief is a pure function of the ledger rows. All
   time math is anchored to the newest observation (`generatedAt` included),
   never the wall clock, so the same ledger always produces a byte-identical
   brief. No AI call is involved anywhere.

3. **Structured data only.** No generated prose. The only free-form strings
   are observation texts carried verbatim from the ledger as representative
   evidence. Every other string is a slug, enum, id, or timestamp — enforced
   structurally by the "structured data only" test.

## Structure

```
IdentityBrief
├─ behaviorEngineVersion   "4.2.0"
├─ generatedAt             ISO of the ledger's newest observation; null when empty
├─ topSignals[]            up to 10, strongest (time-decayed) first
│    signal, stage, trend, confidence (0–1), evidenceStrength,
│    representativeEvidence[] (adaptive: see budget below)
├─ signalRelations[]       curated behavioral tensions, fixed table order
│    signals [a, b], dominant, opposing, dominantStrength,
│    opposingStrength, confidence (0–1), evidence[] (≤2, dominant side)
├─ stability
│    band, factors[] (enums, not prose), metrics
│    { totalObservations, activeSignalCount, establishedShare,
│      changingShare, evidenceSpanDays }
├─ recentChanges           slugs grouped by trend, alphabetical
│    emerged / strengthened / weakened / dormant / returned
├─ summary
│    totalObservations, activeSignalCount, dormantSignalCount,
│    breadth, strongestSignal, newestSignal, evidenceSpanDays, maturity
└─ rankedFutures[]         deterministic identity rankings, no narratives
     identityId, canonicalName, score, likelihood (0–100),
     confidence (0–100), evidenceStrength, matchedDimensions
     ── v4.3 attribution (re-exposed from recognition, computed nowhere else):
     supportingDimensions[]      { dimension, identityWeight, userScore, contribution }
     opposingDimensions[]        same shape, most negative first
     supportingEvidence[]        top 5 { observationId, observation, momentId, contribution }
     opposingEvidence[]          top 3, most negative first
     supportingSituationCount    distinct positive situations (uncapped)
     supportingObservationCount  positive observations (uncapped)
```

The attribution fields are typed optional only so consumer VIEWS may hide
them — `buildIdentityBrief` always sets them. Current Self's view strips
them (`stripRankedFutureAttribution`) to keep its prompt unchanged; the
Future Selves migration is their intended consumer.

## Semantics and thresholds

### Signal stages (from the ledger)

`glimpsed → emerging → established → defining`. Breadth (distinct situations)
gates promotion: emerging needs 2 occurrences; established needs 4 across 2+
situations; defining needs 7 across 3+. Repetition inside a single situation
stalls at emerging.

### Trends

Two consecutive windows behind the ledger's reference time (the newest
observation): **recent** = last 90 days, **previous** = 90–180 days back;
everything else is older history. Ninety days matches the product's framing
of identity change in seasons.

| Trend | Condition |
| --- | --- |
| `dormant` | no recent activity |
| `emerged` | first-ever activity is recent |
| `returned` | recent activity, quiet previous window, older history exists |
| `strengthened` | more recent activity than previous |
| `weakened` | less recent activity than previous (but some) |
| `stable` | equal activity in both windows |

Rows without a timestamp count as older history in a timestamped ledger
(recency unknowable); in a ledger with no timestamps at all, every occurrence
counts as recent.

### Signal relations

A static, type-checked table of opposing-behavior pairs
(`SIGNAL_RELATION_PAIRS`): solo↔collaboration, engage↔avoid conflict,
take↔decline risk, adapt↔resist change, own-terms↔defer, stay↔move-on.
A relation appears only when at least one side has evidence. `confidence` is
lopsidedness `(dominantShare − 0.5) × 2` discounted by volume
`min(1, totalStrength / 6)`; a perfectly balanced tension has no dominant
side and confidence 0.

### Stability bands

| Band | Condition (checked in order) |
| --- | --- |
| `forming` | fewer than 5 observations, or evidence span under 30 days |
| `shifting` | ≥ 50% of active signals are changing (emerged/strengthened/weakened/returned) |
| `settled` | ≥ 50% of signals established+ and < 25% changing |
| `steadying` | everything else |

`factors` explains the verdict with enums (`insufficient_history`,
`high_recent_change`, `broad_established_base`, …) — consumers may render
them however they like, but the brief itself never carries prose.

### Adaptive representative evidence

Profile maturity is evidence volume: **weak** < 8 observations,
**growing** 8–19, **established** ≥ 20. The per-signal evidence budget is
2 / 3 / 5 respectively. The ledger retains up to 5 examples per signal
(newest first, deterministic tie-breaks); the brief exposes a slice — it
never re-selects.

### Ranked futures

The brief delegates to the product's existing deterministic recognition
pipeline (`identity-recognition.ts`) unchanged — same likelihood scale, same
confidence formula, same default thresholds (likelihood ≥ 10, top 5). Only
structured fields are exposed; narrative generation stays where it is today
and is NOT part of the brief.

## Guarantees (pinned by tests)

- Same ledger ⇒ identical brief, independent of row order.
- A new observation at the same reference time changes only the fields
  related to its signals; unrelated signal states, relations, and trend
  groups are byte-identical.
- Representative evidence selection is stable under unrelated additions.
- All orderings are deterministic (strength-then-slug for signals, fixed
  table order for relations, alphabetical for trend groups).
- No free-form strings beyond verbatim ledger evidence.

## Current wiring

- `runBehaviorLedgerShadow` (`src/lib/behavior-ledger-shadow.ts`) builds a
  brief after every ledger write, right after the legacy-parity comparison
  (phase 2 shadow pass).
- Current Self (phase 4): `loadCurrentSelfBriefContext` regenerates the brief
  on read — it is not persisted; the fold is cheap and pure. See
  `docs/current-self-brief-migration.md` for the migration boundary,
  fallback rules, and validation results.

**Do not** wire any further feature to the brief without a migration plan:
Timeline and Monthly Reflection still read the legacy pipeline and remain
unaudited. Both systems must keep working side by side until each consumer
is deliberately migrated. Open brief items: v4.4 `supportingSituations`
re-exposure (removes Future Selves' evidence-grouping view), and the
sub-threshold ranking gap that keeps <2-identity accounts on the legacy
Future Selves path.
