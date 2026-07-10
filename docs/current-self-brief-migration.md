# Current Self → Identity Brief migration (Behavior Engine v4, Phase 4)

Current Self now generates from the Identity Brief by default. The legacy
pipeline is intact, byte-identical, and one env var away.

## The migration boundary

| | Legacy | Brief (default) |
| --- | --- | --- |
| Selected by | `CURRENT_SELF_ENGINE=legacy` | default, or `CURRENT_SELF_ENGINE=brief` |
| Context profile | `current_self` (7 queries: moments, paths, check-ins, identity updates, future selves, counts) | `current_self_brief` (1 query via the shared accessor `getIdentityBriefForUser` → `buildIdentityBrief`) |
| Prompt | `current_self.generate` v10 (discovery: "find the recurring tradeoffs in this raw history") | `current_self.generate_from_brief` v1 (explanation: "the tradeoffs are the signalRelations — explain them") |
| Output schema | title, summary, values, fears, tension, tradeoff, growth, **themes** | same minus themes — themes are derived deterministically (`deriveThemesFromBrief`) |
| Themes | model-chosen from raw theme tags | static signal→theme rename over the brief's own signal ordering (gap G1) |

**Automatic legacy fallback:** regardless of the flag, a user whose ledger has
zero observations generates through the legacy pipeline. This covers
extraction failures and — critically — mock-mode development accounts, where
extraction produces no observations (audit gap G7). Dev experience is
unchanged.

**Reverting** is `CURRENT_SELF_ENGINE=legacy`. Nothing was deleted: the v10
prompt, `loadCurrentSelfContext`, the legacy mock generator, and every legacy
test are untouched.

## What Claude no longer does

The v10 prompt asked the model to discover: find recurring tradeoffs across
raw situations, judge which side keeps winning, weigh evidence volume, detect
what's changing. All of that is now the deterministic engine's output:

| Was model judgment | Now brief field |
| --- | --- |
| strongest recurring patterns | `topSignals` (strength-ordered) |
| tradeoffs / "what repeatedly wins" | `signalRelations` (dominant side) |
| the central contradiction | the high-evidence, low-lopsidedness relation |
| what's changing | `recentChanges` + per-signal `trend` |
| evidence calibration / confidence | `summary.maturity`, `stability`, per-signal `stage`/`confidence` |
| themes | not model output at all — derived in code |

Claude's remaining job: transform structured identity into the same natural
language the page has always shown.

## Consumer rule

Current Self performs **no deterministic identity reasoning** of its own:

- The brief comes only from the shared accessor
  (`src/lib/identity-brief-source.ts` → `buildIdentityBrief`). Current Self
  never queries the ledger with its own shape or folds observations itself.
- `deriveThemesFromBrief` is filter/reorder/rename, not inference: it walks
  `topSignals` in the engine's own strength order and translates slugs into
  the display vocabulary through a static table (dedupe, cap 6, pad to 4).
  It computes no scores and creates no semantics. If a second consumer ever
  needs themes, promote the mapping into the brief (v4.3 candidate) instead
  of copying it.
- The only Behavior Engine interaction besides reading the brief is
  *invoking* Layer 0 extraction for a just-answered reflection (idempotent),
  which is calling the engine, not reimplementing it.

## Sequencing fix (audit gap G4)

An answered reflection triggers an immediate Current Self regeneration, but
its ledger extraction previously ran later (inside Future Selves
generation). Brief mode would have generated from a ledger missing exactly
the event it was reacting to. `submitReflectionAnswer` now passes
`checkInId`, and brief-mode generation runs the (idempotent) extraction for
that check-in before building the brief; the Future Selves run afterwards
finds the observations already extracted and skips, exactly as before.

## Shadow comparison

`CURRENT_SELF_SHADOW_COMPARE=true` (non-production only — it doubles AI
spend per regeneration): every generation also runs the other engine and
logs `[current-self-shadow]` with a structural diff (titles, value names,
fear themes, tension length, tradeoff presence, growth counts, theme sets)
plus both full drafts for human review. Nothing is persisted or shown to
users.

## Measured prompt reduction

Representative established persona (40 observations, 8 situations) vs. the
legacy context at its SQL caps:

| | Legacy | Brief | Change |
| --- | --- | --- | --- |
| System prompt | 21,882 chars | 6,948 chars | **−68.2%** |
| User prompt | 12,230 chars | 14,914 chars | +21.9% |
| Total | 34,112 chars (~8.5k tokens) | 21,862 chars (~5.5k tokens) | **−35.9%** |

The user payload is somewhat larger — an established profile's brief carries
5 evidence entries per signal as structured JSON, where the legacy raw
context was truncated at the same 12,000-char JSON budget (the brief is
subject to that budget too; the truncation tiers trim its evidence lists
rather than dropping it). The win is the system prompt and the deleted
discovery instructions; net ~3,000 fewer input tokens per generation before
prompt caching, and one DB query instead of seven.

## Validation

Automated (pinned in `current-self-brief.test.ts`):
- engine flag defaults/reverts/fails-closed on typos;
- theme derivation is deterministic, always 4–6 valid vocabulary themes,
  maps negative-direction signals away from "Courage", pads sparse ledgers;
- the brief prompt context contains **no** raw situations, check-ins,
  reflections, or prior AI output (asserted key-by-key);
- prompt-size reduction asserted (system < 60% of legacy, total < 80%);
- mock drafts satisfy the output schema from sparse and established briefs.

Live-output comparison (requires an API key; not runnable in CI):
1. On a development account with a populated ledger, set
   `CURRENT_SELF_SHADOW_COMPARE=true`.
2. Trigger regenerations (complete a situation / answer a reflection).
3. Review `[current-self-shadow]` logs: hero title register, whether values
   name the same underlying tradeoffs, whether fears stay person-shaped,
   tension/tradeoff presence, theme drift between model-chosen and derived.
4. Expected differences that are NOT regressions: themes may reorder
   (derived ranking vs model choice); values may rename to a synonym of the
   same tradeoff. Regressions to watch for: hero paragraph losing the
   hidden-belief framing on sparse ledgers (the legacy pipeline saw raw
   reflection prose the brief distills away), and tradeoff returning null
   more often at low maturity (by design — verify it feels right).

## Known, accepted differences

- **Verbatim user voice is gone from the prompt** (audit G3, signed off in
  phase 3): the model reads distilled observations, never the user's own
  reflection text. The portrait rules banned quoting it anyway.
- **Themes are derived, not generated.** Same vocabulary, deterministic,
  evidence-weighted — but a given account's theme chips may differ from what
  the model would have picked.
- **Portrait quality is now bounded by extraction quality.** Users with thin
  ledgers get restrained portraits (maturity calibration) instead of
  portraits padded from raw context.
